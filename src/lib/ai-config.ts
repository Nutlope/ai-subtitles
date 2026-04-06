export const AI_CONFIG = {
    model: {
        id: "nvidia/parakeet-tdt-0.6b-v3",
        name: "Parakeet TDT v3",
        provider: "NVIDIA",
        wordTimestamps: false,
    },
    api: {
        baseURL: "https://api.together.xyz/v1",
        platform: "Together AI",
        platformUrl: "https://together.ai",
    },
    branding: {
        poweredBy: "Powered by Together AI x NVIDIA Parakeet",
        processingLabel: "Transcribing with AI",
        logoSrc: "/together-ai-new-logo.png",
        logoSoloSrc: "/together-logo-solo.svg",
        tips: [
            "Powered by Together AI — the fastest inference cloud",
            "NVIDIA Parakeet TDT v3 — 1.56× faster than Whisper",
            "Together AI — 200+ open-source models, one simple API",
            "Parakeet TDT v3 — 2.16% WER on LibriSpeech, best in class",
            "From prototype to production at any scale — together.ai",
            "The leading cloud platform for open-source AI inference",
            "Together AI — Build, fine-tune, and scale generative AI",
        ],
    },
} as const;
