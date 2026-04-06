export const AI_CONFIG = {
    model: {
        id: "openai/whisper-large-v3",
        name: "Whisper Large v3",
        provider: "OpenAI",
        wordTimestamps: true,
    },
    api: {
        baseURL: "https://api.together.xyz/v1",
        platform: "Together AI",
        platformUrl: "https://together.ai",
    },
    branding: {
        poweredBy: "Powered by Together AI x Whisper",
        processingLabel: "Transcribing with AI",
        logoSrc: "/together-ai-new-logo.png",
        logoSoloSrc: "/together-logo-solo.svg",
        tips: [
            "Powered by Together AI — the fastest inference cloud",
            "Together AI runs Whisper Large v3 up to 15× faster than alternatives",
            "Together AI — 200+ open-source models, one simple API",
            "Build with Llama, Mixtral, Whisper & more on Together AI",
            "From prototype to production at any scale — together.ai",
            "The leading cloud platform for open-source AI inference",
            "Together AI — Build, fine-tune, and scale generative AI",
        ],
    },
} as const;
