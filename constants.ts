export const VIDEO_MODELS = [
    { id: 'veo-2.0-generate-001', name: 'Veo 2 (Gemini)', provider: 'gemini' },
    { id: 'sora-openai', name: 'Sora (OpenAI)', provider: 'sora' },
    { id: 'sora-azure', name: 'Sora (Azure)', provider: 'azure' },
    { id: 'kling-1', name: 'Kling', provider: 'kling' },
    { id: 'minimax-v1', name: 'Minimax', provider: 'minimax' },
    { id: 'deepai-video', name: 'Video Generator (DeepAI)', provider: 'deepai' },
];

export const IMAGE_MODELS = [
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4 (Gemini)', provider: 'gemini' },
    { id: 'dalle-3', name: 'DALL-E 3 (OpenAI)', provider: 'sora' },
];

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export const MAX_CONCURRENT_JOBS = 4;
export const RATE_LIMIT_COUNT = 4; // Max jobs per minute
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const MAX_RETRIES = 3; // Max number of automatic retries