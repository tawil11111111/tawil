export enum JobStatus {
    Pending = 'Pending',
    Processing = 'Processing',
    Completed = 'Completed',
    Failed = 'Failed',
}

export enum InputType {
    TextToVideo = 'TextToVideo',
    ImageToVideo = 'ImageToVideo',
    TextToImage = 'TextToImage',
}

export interface Job {
    id: string;
    prompt: string;
    inputType: InputType;
    model: string;
    aspectRatio: string;
    outputs: number;
    image?: {
        base64: string;
        mimeType: string;
        name: string;
    };
    status: JobStatus;
    retryCount: number;
    resultUrl?: string;
    resultUrls?: string[];
    error?: string;
}