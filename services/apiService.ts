import { GoogleGenAI } from "@google/genai";
import { Job, InputType } from "../types";
import { VIDEO_MODELS, IMAGE_MODELS } from '../constants';

export class QuotaExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuotaExceededError';
    }
}

const pollOperation = async (operation: any, ai: GoogleGenAI): Promise<any> => {
    let currentOperation = operation;
    while (!currentOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
        } catch (e) {
            console.error("Polling failed:", e);
            throw e;
        }
    }
    return currentOperation;
};

// --- VIDEO GENERATION ---

const generateVideoWithGemini = async (job: Job, apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    try {
        const requestPayload: any = {
            model: job.model,
            prompt: job.prompt,
            config: { numberOfVideos: job.outputs, aspectRatio: job.aspectRatio },
        };

        if (job.inputType === InputType.ImageToVideo && job.image) {
            requestPayload.image = { imageBytes: job.image.base64, mimeType: job.image.mimeType };
        }

        let operation = await ai.models.generateVideos(requestPayload);
        const completedOperation = await pollOperation(operation, ai);
        
        const downloadLink = completedOperation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Không tìm thấy link tải xuống video.");

        const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!videoResponse.ok) throw new Error(`Không thể tải tệp video: ${videoResponse.statusText}`);

        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error: any) {
        const errorMessage = error?.error?.message || error?.message || "Lỗi không xác định khi tạo video.";
        if (error?.error?.status === 'RESOURCE_EXHAUSTED' || errorMessage.includes('Lifetime quota exceeded')) {
            throw new QuotaExceededError('Hạn ngạch API Gemini đã hết.');
        }
        throw new Error(errorMessage);
    }
};

const generateVideoWithSora = async (job: Job, apiKey: string): Promise<string> => { throw new Error("API của Sora chưa được phát hành công khai."); };
const generateVideoWithKling = async (job: Job, apiKey: string): Promise<string> => { throw new Error("API của Kling chưa được phát hành công khai."); };
const generateVideoWithMinimax = async (job: Job, apiKey: string): Promise<string> => { throw new Error("API của Minimax chưa được phát hành công khai."); };

const generateVideoWithDeepAI = async (job: Job, apiKey: string): Promise<string> => {
    if (job.inputType === InputType.ImageToVideo) {
        throw new Error('Tạo video từ hình ảnh không được DeepAI hỗ trợ tại thời điểm này.');
    }

    try {
        const formData = new FormData();
        formData.append('text', job.prompt);

        const response = await fetch('https://api.deepai.org/api/text2video', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
            },
            body: formData,
        });
        
        if (!response.ok) {
            let errorMessage = `Lỗi HTTP: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.err) {
                    errorMessage = errorData.err;
                }
            } catch (e) { /* response was not json, use status text */ }

            if (response.status === 429) { // Too Many Requests
                throw new QuotaExceededError('Hạn ngạch API DeepAI đã hết hoặc bạn đang gửi yêu cầu quá nhanh.');
            }
            throw new Error(`Lỗi DeepAI: ${errorMessage}`);
        }

        const result = await response.json();
        const videoUrl = result.output_url;
        if (!videoUrl) throw new Error('DeepAI API không trả về URL video.');

        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) throw new Error(`Không thể tải tệp video từ DeepAI: ${videoResponse.statusText}`);

        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error: any) {
        if (error instanceof QuotaExceededError) {
            throw error;
        }
        throw new Error(error.message || 'Lỗi không xác định khi gọi DeepAI API.');
    }
};

const generateVideoWithAzure = async (job: Job, apiKey: string): Promise<string> => { throw new Error("API của Azure Video chưa được phát hành công khai."); };

const generateVideo = async (job: Job, apiKeys: { [key: string]: string | null }): Promise<string> => {
    const modelInfo = VIDEO_MODELS.find(m => m.id === job.model);
    if (!modelInfo) throw new Error(`Không tìm thấy thông tin cho mô hình: ${job.model}`);
    
    const apiKey = apiKeys[modelInfo.provider];
    if (!apiKey) throw new Error(`Vui lòng cung cấp khóa API cho ${modelInfo.provider.toUpperCase()}.`);
    
    switch (modelInfo.provider) {
        case 'gemini': return generateVideoWithGemini(job, apiKey);
        case 'sora': return generateVideoWithSora(job, apiKey);
        case 'kling': return generateVideoWithKling(job, apiKey);
        case 'minimax': return generateVideoWithMinimax(job, apiKey);
        case 'deepai': return generateVideoWithDeepAI(job, apiKey);
        case 'azure': return generateVideoWithAzure(job, apiKey);
        default: throw new Error(`Nhà cung cấp không được hỗ trợ: ${modelInfo.provider}`);
    }
};

// --- IMAGE GENERATION ---

const generateImagesWithGemini = async (job: Job, apiKey: string): Promise<string[]> => {
     const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateImages({
            model: job.model,
            prompt: job.prompt,
            config: {
              numberOfImages: job.outputs,
              outputMimeType: 'image/jpeg',
              aspectRatio: job.aspectRatio,
            },
        });

        return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
    } catch (error: any) {
        const errorMessage = error?.error?.message || error?.message || "Lỗi không xác định khi tạo ảnh.";
         if (error?.error?.status === 'RESOURCE_EXHAUSTED' || errorMessage.includes('quota')) {
            throw new QuotaExceededError('Hạn ngạch API Gemini đã hết.');
        }
        throw new Error(errorMessage);
    }
}

const generateImagesWithDalle = async (): Promise<string[]> => { throw new Error("API của DALL-E 3 chưa được tích hợp."); };


const generateImages = async (job: Job, apiKeys: { [key: string]: string | null }): Promise<string[]> => {
    const modelInfo = IMAGE_MODELS.find(m => m.id === job.model);
    if (!modelInfo) throw new Error(`Không tìm thấy thông tin cho mô hình: ${job.model}`);

    const apiKey = apiKeys[modelInfo.provider];
    if (!apiKey) throw new Error(`Vui lòng cung cấp khóa API cho ${modelInfo.provider.toUpperCase()}.`);

    switch (modelInfo.id) { // Switch on model id for images as provider can be the same (e.g. Gemini)
        case 'imagen-4.0-generate-001':
            return generateImagesWithGemini(job, apiKey);
        case 'dalle-3':
             return generateImagesWithDalle();
        default:
             if(modelInfo.provider === 'gemini') return generateImagesWithGemini(job, apiKey);
             throw new Error(`Mô hình ảnh không được hỗ trợ: ${job.model}`);
    }
};


// --- MAIN JOB PROCESSOR ---

export const processJob = async (job: Job, apiKeys: { [key: string]: string | null }): Promise<{ resultUrl?: string, resultUrls?: string[] }> => {
    if (job.inputType === InputType.TextToImage) {
        const urls = await generateImages(job, apiKeys);
        return { resultUrls: urls };
    } else {
        const url = await generateVideo(job, apiKeys);
        return { resultUrl: url };
    }
};