import React from 'react';
import { Job, JobStatus, InputType } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { RetryIcon } from './icons/RetryIcon';
import { CancelIcon } from './icons/CancelIcon';
import { MAX_RETRIES } from '../constants';

interface JobQueueProps {
    jobs: Job[];
    onRetryJob: (jobId: string) => void;
    onCancelJob: (jobId:string) => void;
}

const statusStyles: { [key in JobStatus]: { badge: string, text: string } } = {
    [JobStatus.Pending]: { badge: 'bg-yellow-500/20 text-yellow-300', text: 'Đang chờ' },
    [JobStatus.Processing]: { badge: 'bg-blue-500/20 text-blue-300 animate-pulse', text: 'Đang xử lý...' },
    [JobStatus.Completed]: { badge: 'bg-green-500/20 text-green-300', text: 'Hoàn thành' },
    [JobStatus.Failed]: { badge: 'bg-red-500/20 text-red-300', text: 'Thất bại' },
};

const JobRow: React.FC<{ job: Job; onRetryJob: (jobId: string) => void; onCancelJob: (jobId: string) => void; }> = ({ job, onRetryJob, onCancelJob }) => {
    const statusInfo = statusStyles[job.status];

    const handleDownload = () => {
        if (job.resultUrl) { // Single video download
            const a = document.createElement('a');
            a.href = job.resultUrl;
            a.download = `video_${job.id.substring(0, 8)}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else if (job.resultUrls) { // Multiple image download
             job.resultUrls.forEach((url, index) => {
                setTimeout(() => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `image_${job.id.substring(0, 8)}_${index + 1}.jpeg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }, index * 200);
            });
        }
    };

    const statusText = statusInfo.text;
    const isRetrying = job.retryCount > 0 && (job.status === JobStatus.Pending || job.status === JobStatus.Processing);
    const retryDisplay = isRetrying ? ` (Thử lại ${job.retryCount}/${MAX_RETRIES})` : '';

    return (
        <div className="bg-gray-800/60 p-4 rounded-lg mb-3 flex flex-col md:flex-row md:items-center gap-4 border border-gray-700/50">
            <div className="flex-grow">
                <p className="font-semibold text-purple-300 break-words">{job.prompt}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
                    <span>Mô hình: {job.model}</span>
                    <span>Tỉ lệ: {job.aspectRatio}</span>
                    <span>Số lượng: {job.outputs}</span>
                    {job.image && <span className="truncate max-w-[150px]">Ảnh: {job.image.name}</span>}
                </div>
            </div>
            <div className="flex-shrink-0 md:w-80 flex items-center justify-between md:justify-end gap-4">
                <span className={`px-3 py-1 text-sm font-bold rounded-full ${statusInfo.badge}`}>{statusText}{retryDisplay}</span>
                <div className="flex items-center gap-2">
                    {(job.status === JobStatus.Pending || job.status === JobStatus.Processing) && (
                         <button onClick={() => onCancelJob(job.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition" title="Hủy bỏ">
                            <CancelIcon />
                        </button>
                    )}
                    {job.status === JobStatus.Processing && (
                        <div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div>
                    )}
                    {job.status === JobStatus.Completed && (
                        <>
                            {job.resultUrl && (
                                <video src={job.resultUrl} controls className="w-28 h-16 rounded-md bg-black" />
                            )}
                             {job.resultUrls && job.resultUrls.length > 0 && (
                                <div className="flex-1 overflow-x-auto">
                                    <div className="flex gap-2 p-1">
                                    {job.resultUrls.map((url, index) => (
                                        <a key={index} href={url} download={`image_${job.id.substring(0,8)}_${index+1}.jpeg`}>
                                            <img src={url} alt={`Generated image ${index + 1}`} className="w-16 h-16 object-cover rounded-md bg-black hover:opacity-80 transition" />
                                        </a>
                                    ))}
                                    </div>
                                </div>
                            )}
                            <button onClick={handleDownload} className="p-2 text-cyan-300 hover:bg-cyan-500/20 rounded-full transition" title="Tải xuống">
                                <DownloadIcon />
                            </button>
                        </>
                    )}
                    {job.status === JobStatus.Failed && (
                        <>
                            <p className="text-xs text-red-400 max-w-[150px] truncate" title={job.error}>Lỗi: {job.error}</p>
                             {job.error !== 'Đã hủy bởi người dùng' && (
                                <button onClick={() => onRetryJob(job.id)} className="p-2 text-yellow-300 hover:bg-yellow-500/20 rounded-full transition" title="Thử lại">
                                    <RetryIcon />
                                </button>
                             )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


export const JobQueue: React.FC<JobQueueProps> = ({ jobs, onRetryJob, onCancelJob }) => {
    if (jobs.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-800/60 rounded-lg border-2 border-dashed border-gray-600">
                <p className="text-gray-400">Hàng đợi công việc của bạn trống.</p>
                <p className="text-gray-500 text-sm">Thêm công việc ở trên để bắt đầu!</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {jobs.map(job => (
                <JobRow key={job.id} job={job} onRetryJob={onRetryJob} onCancelJob={onCancelJob} />
            ))}
        </div>
    );
};