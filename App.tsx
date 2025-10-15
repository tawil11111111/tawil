import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Job, JobStatus, InputType } from './types';
import { JobInputForm } from './components/JobInputForm';
import { JobQueue } from './components/JobQueue';
import { ApiKeysManager } from './components/ApiKeysManager';
import { processJob, QuotaExceededError } from './services/apiService';
import { MAX_CONCURRENT_JOBS, RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS, MAX_RETRIES, VIDEO_MODELS, IMAGE_MODELS } from './constants';
import { DownloadIcon } from './components/icons/DownloadIcon';

export type Provider = 'gemini' | 'sora' | 'kling' | 'minimax' | 'deepai' | 'azure';

const App: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [apiKeys, setApiKeys] = useState<{ [key in Provider]?: string | null }>(() => {
        try {
            const storedKeys = localStorage.getItem('video-gen-api-keys');
            return storedKeys ? JSON.parse(storedKeys) : {};
        } catch (error) {
            return {};
        }
    });
    const [quotaExceededProviders, setQuotaExceededProviders] = useState(new Set<Provider>());
    const jobStartTimestamps = useRef<number[]>([]);
    const cancelledJobIds = useRef(new Set<string>());

    const processQueue = useCallback(async () => {
        if (quotaExceededProviders.size > 0) return;

        const now = Date.now();
        jobStartTimestamps.current = jobStartTimestamps.current.filter(
            timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
        );

        const processingJobs = jobs.filter(j => j.status === JobStatus.Processing).length;
        const availableConcurrencySlots = MAX_CONCURRENT_JOBS - processingJobs;
        const availableRateLimitSlots = RATE_LIMIT_COUNT - jobStartTimestamps.current.length;
        
        const slotsToProcess = Math.min(availableConcurrencySlots, availableRateLimitSlots);

        if (slotsToProcess <= 0) return;

        const pendingJobs = jobs.filter(j => j.status === JobStatus.Pending);
        
        const jobsToStart = [];
        for (const job of pendingJobs) {
            const modelList = job.inputType === InputType.TextToImage ? IMAGE_MODELS : VIDEO_MODELS;
            const modelInfo = modelList.find(m => m.id === job.model);
            if(modelInfo && apiKeys[modelInfo.provider as Provider] && jobsToStart.length < slotsToProcess) {
                jobsToStart.push(job);
            }
        }
        
        if (jobsToStart.length === 0) return;

        jobsToStart.forEach(jobToStart => {
            setJobs(prevJobs => prevJobs.map(j => 
                j.id === jobToStart.id ? { ...j, status: JobStatus.Processing } : j
            ));
            
            jobStartTimestamps.current.push(Date.now());

            processJob(jobToStart, apiKeys as { [key: string]: string; })
                .then(result => {
                    if (cancelledJobIds.current.has(jobToStart.id)) {
                        cancelledJobIds.current.delete(jobToStart.id);
                        return;
                    }
                    setJobs(prevJobs => prevJobs.map(j =>
                        j.id === jobToStart.id ? { ...j, status: JobStatus.Completed, ...result, error: undefined } : j
                    ));
                })
                .catch(error => {
                    if (cancelledJobIds.current.has(jobToStart.id)) {
                        cancelledJobIds.current.delete(jobToStart.id);
                        return;
                    }
                    console.error(`Job ${jobToStart.id} failed:`, error);
                    
                    const modelList = jobToStart.inputType === InputType.TextToImage ? IMAGE_MODELS : VIDEO_MODELS;
                    const modelInfo = modelList.find(m => m.id === jobToStart.model);
                    const provider = modelInfo?.provider as Provider | undefined;

                    if (error instanceof QuotaExceededError && provider) {
                        setQuotaExceededProviders(prev => new Set(prev).add(provider));
                        setJobs(prevJobs => prevJobs.map(j =>
                            j.id === jobToStart.id ? { ...j, status: JobStatus.Failed, error: error.message } : j
                        ));
                        return;
                    }

                    setJobs(prevJobs => prevJobs.map(j => {
                        if (j.id === jobToStart.id) {
                            if (j.retryCount < MAX_RETRIES) {
                                return { ...j, status: JobStatus.Pending, retryCount: j.retryCount + 1, error: 'Tự động thử lại...' };
                            } else {
                                return { ...j, status: JobStatus.Failed, error: error.message || 'Lỗi không xác định' };
                            }
                        }
                        return j;
                    }));
                });
        });

    }, [jobs, apiKeys, quotaExceededProviders]);

    useEffect(() => {
        const hasPendingJobs = jobs.some(j => j.status === JobStatus.Pending);
        if (hasPendingJobs && quotaExceededProviders.size === 0) {
            const interval = setInterval(() => {
                processQueue();
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [jobs, processQueue, quotaExceededProviders]);

    const handleAddJobs = (newJobs: Omit<Job, 'id' | 'status' | 'retryCount'>[]) => {
        const formattedJobs: Job[] = newJobs.map(job => ({
            ...job,
            id: crypto.randomUUID(),
            status: JobStatus.Pending,
            retryCount: 0,
        }));
        setJobs(prevJobs => [...prevJobs, ...formattedJobs]);
    };
    
    const handleSaveApiKey = (provider: Provider, newKey: string) => {
        if (newKey) {
            const newKeys = { ...apiKeys, [provider]: newKey };
            setApiKeys(newKeys);
            localStorage.setItem('video-gen-api-keys', JSON.stringify(newKeys));
            setQuotaExceededProviders(prev => {
                const newSet = new Set(prev);
                newSet.delete(provider);
                return newSet;
            });
        }
    };

    const handleRetryJob = (jobId: string) => {
        setJobs(prevJobs => prevJobs.map(j =>
            j.id === jobId ? { ...j, status: JobStatus.Pending, error: undefined, retryCount: 0 } : j
        ));
    };

    const handleCancelJob = (jobId: string) => {
        cancelledJobIds.current.add(jobId);
        setJobs(prevJobs => prevJobs.map(j =>
            j.id === jobId ? { ...j, status: JobStatus.Failed, error: 'Đã hủy bởi người dùng' } : j
        ));
    };

    const handleDownloadAll = () => {
        const completedJobs = jobs.filter(j => j.status === JobStatus.Completed);
        completedJobs.forEach((job) => {
             if (job.resultUrl) { // Video job
                const a = document.createElement('a');
                a.href = job.resultUrl!;
                a.download = `video_${job.id.substring(0, 8)}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else if (job.resultUrls) { // Image job
                job.resultUrls.forEach((url, index) => {
                     setTimeout(() => {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `image_${job.id.substring(0, 8)}_${index + 1}.jpeg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }, index * 300);
                });
            }
        });
    };

    const completedJobsCount = jobs.filter(j => j.status === JobStatus.Completed).length;
    const hasAnyKey = Object.values(apiKeys).some(key => !!key);
    const availableProviders = Object.entries(apiKeys)
        .filter(([, key]) => !!key)
        .map(([provider]) => provider as Provider);

    return (
        <div 
            className="min-h-screen bg-gray-900 text-white font-mono p-4 sm:p-8 bg-cover bg-fixed bg-center"
            style={{backgroundImage: "url('https://cdn-media.sforum.vn/storage/app/media/thanhhuyen/%E1%BA%A3nh%20%C4%91%E1%BB%99ng%20anime/1/anh-dong-anime-5.gif')"}}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            <div className="relative z-10 max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(0,255,255,0.7)]">
                        Trình tạo Video & Ảnh hàng loạt
                    </h1>
                    <p className="text-purple-300 mt-2">Tạo song song với nhiều nhà cung cấp AI</p>
                </header>
                
                <main>
                    {!hasAnyKey && jobs.length === 0 && (
                         <div className="bg-blue-900/80 border border-blue-600 text-white text-center p-4 rounded-xl mb-8">
                            <p className="font-bold text-lg">Chào mừng bạn!</p>
                            <p className="text-sm mt-1">Để bắt đầu, vui lòng chọn một nhà cung cấp bên dưới và nhập khóa API của bạn.</p>
                        </div>
                    )}

                    <ApiKeysManager onSave={handleSaveApiKey} quotaExceededProviders={quotaExceededProviders} savedKeys={apiKeys} />

                    {quotaExceededProviders.size > 0 && (
                        <div className="bg-red-900/80 border border-red-600 text-white text-center p-4 rounded-xl mb-8">
                            <p className="font-bold text-lg">Đã đạt đến hạn ngạch API</p>
                            <p className="text-sm mt-1">Quá trình xử lý đã dừng. Vui lòng kiểm tra các tab API ở trên và cung cấp khóa mới.</p>
                        </div>
                    )}

                    <JobInputForm onAddJobs={handleAddJobs} isDisabled={!hasAnyKey} availableProviders={availableProviders} />
                    
                    <div className="mt-12">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-cyan-300">Hàng đợi công việc</h2>
                        {completedJobsCount > 0 && (
                          <button
                            onClick={handleDownloadAll}
                            className="flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg border-2 border-purple-600 transition-all duration-300 rgb-glow-button"
                          >
                            <DownloadIcon />
                            Tải xuống tất cả
                          </button>
                        )}
                      </div>
                      <JobQueue jobs={jobs} onRetryJob={handleRetryJob} onCancelJob={handleCancelJob} />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;