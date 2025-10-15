import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Job, InputType } from '../types';
import { VIDEO_MODELS, IMAGE_MODELS, ASPECT_RATIOS } from '../constants';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UploadIcon } from './icons/UploadIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { Provider } from '../App';

type JobTemplate = Omit<Job, 'id' | 'status' | 'retryCount'>;

interface JobInputFormProps {
    onAddJobs: (jobs: JobTemplate[]) => void;
    isDisabled: boolean;
    availableProviders: Provider[];
}

export const JobInputForm: React.FC<JobInputFormProps> = ({ onAddJobs, isDisabled, availableProviders }) => {
    
    const getAvailableModels = useCallback((inputType: InputType) => {
        if (availableProviders.length === 0) return [];
        const modelList = inputType === InputType.TextToImage ? IMAGE_MODELS : VIDEO_MODELS;
        return modelList.filter(model => 
            availableProviders.includes(model.provider as Provider)
        );
    }, [availableProviders]);

    const createDefaultJob = useCallback((): JobTemplate => {
        const availableVideoModels = getAvailableModels(InputType.TextToVideo);
        return {
            prompt: '',
            inputType: InputType.TextToVideo,
            model: availableVideoModels.length > 0 ? availableVideoModels[0].id : '',
            aspectRatio: ASPECT_RATIOS[1],
            outputs: 1,
        };
    }, [getAvailableModels]);
    
    const [jobTemplates, setJobTemplates] = useState<JobTemplate[]>([createDefaultJob()]);
    const [bulkPrompts, setBulkPrompts] = useState('');

     useEffect(() => {
        if (!availableProviders.length) {
            setJobTemplates(prev => prev.map(t => ({...t, model: ''})));
            return;
        }
        setJobTemplates(prevTemplates => {
            return prevTemplates.map(template => {
                 const availableModels = getAvailableModels(template.inputType);
                 const isModelAvailable = availableModels.some(m => m.id === template.model);
                 if (!isModelAvailable) {
                     return {
                         ...template,
                         model: availableModels.length > 0 ? availableModels[0].id : ''
                     };
                 }
                 return template;
            });
        });
    }, [availableProviders, getAvailableModels]);

    const handleTemplateChange = <K extends keyof JobTemplate>(index: number, field: K, value: JobTemplate[K]) => {
        const newTemplates = [...jobTemplates];
        newTemplates[index][field] = value;

        if (field === 'inputType') {
            const availableModels = getAvailableModels(value as InputType);
            newTemplates[index]['model'] = availableModels.length > 0 ? availableModels[0].id : '';
        }

        setJobTemplates(newTemplates);
    };
    
    const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                handleTemplateChange(index, 'image', { base64, mimeType: file.type, name: file.name });
            };
            reader.readAsDataURL(file);
        }
    };

    const addJobTemplate = () => {
        if (isDisabled) return;
        setJobTemplates([...jobTemplates, createDefaultJob()]);
    };

    const removeJobTemplate = (index: number) => {
        if (jobTemplates.length > 1) {
            const newTemplates = jobTemplates.filter((_, i) => i !== index);
            setJobTemplates(newTemplates);
        }
    };

    const handleSubmit = () => {
        if (isDisabled) return;
        
        const jobsToAdd: JobTemplate[] = [];

        jobTemplates.forEach(template => {
            if (template.prompt.trim() && template.model) {
                jobsToAdd.push(template);
            }
        });
        
        if (bulkPrompts.trim()) {
            const prompts = bulkPrompts.trim().split('\n').filter(p => p.trim());
            const firstTemplate = jobTemplates[0] || createDefaultJob();
            if (firstTemplate.model) {
                const bulkJobs = prompts.map(prompt => ({
                    ...firstTemplate,
                    prompt: prompt.trim()
                }));
                jobsToAdd.push(...bulkJobs);
            }
        }

        if(jobsToAdd.length > 0) {
            onAddJobs(jobsToAdd);
            setJobTemplates([createDefaultJob()]);
            setBulkPrompts('');
        }
    };
    
    const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

    return (
        <div className={`bg-gray-800/80 backdrop-blur-md p-6 rounded-xl border border-purple-500/50 rgb-glow ${disabledClasses}`}>
            <h3 className="text-xl font-semibold mb-4 text-purple-300">Thêm công việc vào hàng đợi</h3>
            
            {jobTemplates.map((template, index) => {
                 const currentAvailableModels = getAvailableModels(template.inputType);
                 return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 p-4 border-b border-gray-700/50 last:border-b-0 last:mb-0">
                        <div className="col-span-12 md:col-span-5">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nội dung mô tả (Prompt)</label>
                            <textarea
                                value={template.prompt}
                                onChange={(e) => handleTemplateChange(index, 'prompt', e.target.value)}
                                className="w-full bg-gray-900/70 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition disabled:bg-gray-800"
                                rows={3}
                                placeholder="VD: Một con mèo ba tư lông xù đang lái xe"
                                disabled={isDisabled}
                            />
                        </div>

                        <div className="col-span-12 md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Loại đầu vào</label>
                                <select
                                    value={template.inputType}
                                    onChange={(e) => handleTemplateChange(index, 'inputType', e.target.value as InputType)}
                                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition disabled:bg-gray-800"
                                    disabled={isDisabled}
                                >
                                    <option value={InputType.TextToVideo}>Văn bản sang Video</option>
                                    <option value={InputType.ImageToVideo}>Hình ảnh sang Video</option>
                                    <option value={InputType.TextToImage}>Văn bản sang Hình ảnh</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Mô hình</label>
                                <select
                                    value={template.model}
                                    onChange={(e) => handleTemplateChange(index, 'model', e.target.value)}
                                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition disabled:bg-gray-800"
                                    disabled={isDisabled || currentAvailableModels.length === 0}
                                >
                                    {currentAvailableModels.length > 0 ? (
                                        currentAvailableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                    ) : (
                                        <option value="" disabled>Nhập API Key để chọn</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Tỉ lệ khung hình</label>
                                <select
                                    value={template.aspectRatio}
                                    onChange={(e) => handleTemplateChange(index, 'aspectRatio', e.target.value)}
                                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition disabled:bg-gray-800"
                                    disabled={isDisabled}
                                >
                                    {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Số lượng đầu ra</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="4"
                                    value={template.outputs}
                                    onChange={(e) => handleTemplateChange(index, 'outputs', parseInt(e.target.value, 10))}
                                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition disabled:bg-gray-800"
                                    disabled={isDisabled}
                                />
                            </div>
                            
                            {template.inputType === InputType.ImageToVideo && (
                                <div className="col-span-full">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Tải lên hình ảnh</label>
                                    <div className="relative">
                                        <input id={`file-upload-${index}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(index, e)} disabled={isDisabled} />
                                        <label htmlFor={`file-upload-${index}`} className={`cursor-pointer flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 border border-dashed border-gray-500 rounded-md p-2 text-sm text-gray-300 transition ${isDisabled ? 'cursor-not-allowed' : ''}`}>
                                            <UploadIcon />
                                            <span>{template.image?.name || 'Chọn một ảnh'}</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                        {jobTemplates.length > 1 && (
                            <div className="col-span-12 flex items-end justify-end md:col-span-1">
                                 <button onClick={() => removeJobTemplate(index)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition disabled:opacity-50" disabled={isDisabled}>
                                    <TrashIcon />
                                </button>
                            </div>
                        )}
                    </div>
                 )
            })}

            <div className="flex justify-start mb-6">
                <button onClick={addJobTemplate} className="flex items-center gap-2 text-cyan-300 hover:text-cyan-200 font-semibold text-sm disabled:opacity-50 disabled:hover:text-cyan-300" disabled={isDisabled}>
                    <PlusIcon /> Thêm công việc khác
                </button>
            </div>
            
            <div>
                <label htmlFor="bulk-prompts" className="block text-sm font-medium text-gray-300 mb-1">
                    <ClipboardIcon className="inline-block mr-2 h-5 w-5" />
                    Hoặc dán nhiều mô tả (mỗi dòng một mô tả)
                </label>
                <textarea
                    id="bulk-prompts"
                    value={bulkPrompts}
                    onChange={(e) => setBulkPrompts(e.target.value)}
                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition disabled:bg-gray-800"
                    rows={4}
                    placeholder="Một hoàng hôn đẹp trên biển&#x0a;Một thành phố tương lai với xe bay&#x0a;Một chú mèo chơi đàn piano nhỏ"
                    disabled={isDisabled}
                />
                <p className="text-xs text-gray-400 mt-1">Sử dụng cài đặt từ công việc đầu tiên cho tất cả các mô tả được dán.</p>
            </div>

            <div className="mt-6 text-right">
                <button
                    onClick={handleSubmit}
                    disabled={isDisabled}
                    className="bg-cyan-500 text-black font-bold py-2 px-6 rounded-lg border-2 border-cyan-500 transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.7)] rgb-glow-button disabled:bg-gray-700 disabled:border-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    Gửi tất cả vào hàng đợi
                </button>
            </div>
        </div>
    );
};