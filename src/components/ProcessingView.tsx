import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ProcessingViewProps {
    onNext: (jobId: string) => void;
    videoFile: File | null;
    mediaUrl: string;
    setJobId: (id: string) => void;
    setSrtContent: (srt: string) => void;
    setWords: (words: unknown[]) => void;
    isSample: boolean;
    onOutOfCredits: () => void;
    onReset: () => void;
    setBlobUrl: (url: string | null) => void;
}

/* ── Animation variants ── */
const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.1, delayChildren: 0.15 },
    },
};

const childFadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const stageItemVariant = {
    hidden: { opacity: 0, x: -12 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const checkPop = {
    initial: { scale: 0, opacity: 0 },
    animate: {
        scale: 1,
        opacity: 1,
        transition: { type: "spring" as const, stiffness: 500, damping: 15 },
    },
};

export default function ProcessingView({ onNext, videoFile, mediaUrl, setJobId, setSrtContent, setWords, isSample, onOutOfCredits, onReset, setBlobUrl }: ProcessingViewProps) {
    const [currentStage, setCurrentStage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const hasStarted = useRef(false);

    const stages = [
        { id: "ingest", label: "Ingesting video" },
        { id: "extract", label: "Extracting audio" },
        { id: "transcribe", label: "Transcribing with AI (Whisper Large v3)" },
        { id: "format", label: "Formatting subtitles" },
    ];

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        const processVideo = async () => {
            try {
                const apiKey = localStorage.getItem("substudio_together_api_key") || "";
                const freeUsed = localStorage.getItem("substudio_free_used") === "true";

                if (!apiKey && freeUsed && !isSample) {
                    setError("out-of-credits");
                    onOutOfCredits();
                    return;
                }

                setError(null);
                setCurrentStage(0);

                // Stage 0: Ingest Video
                let processResponse;
                let blobUrl: string | null = null;
                if (videoFile) {
                    // Try Vercel Blob upload first (bypasses Vercel's 4.5MB body limit)
                    try {
                        const { upload } = await import('@vercel/blob/client');
                        const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
                        const nameWithoutExt = videoFile.name.replace(/\.[^.]+$/, '');
                        const slug = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
                        const blob = await upload(`${slug}-${crypto.randomUUID()}.${ext}`, videoFile, {
                            access: 'private',
                            handleUploadUrl: '/api/upload',
                        });
                        blobUrl = blob.url;
                        setBlobUrl(blobUrl);
                    } catch (err) {
                        // If Blob token isn't configured, fall back to direct upload.
                        // Otherwise surface the real error to the user.
                        const msg = err instanceof Error ? err.message : String(err);
                        const isMissingConfig =
                            msg.includes('BLOB_READ_WRITE_TOKEN') ||
                            msg.includes('not configured') ||
                            msg.includes('MODULE_NOT_FOUND');
                        if (!isMissingConfig) {
                            throw new Error(`Upload failed: ${msg}`);
                        }
                    }

                    if (blobUrl) {
                        processResponse = await fetch("/api/process", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ blobUrl }),
                        });
                    } else {
                        const formData = new FormData();
                        formData.append("file", videoFile);
                        processResponse = await fetch("/api/process", {
                            method: "POST",
                            body: formData,
                        });
                    }
                } else if (mediaUrl) {
                    processResponse = await fetch("/api/process", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mediaUrl }),
                    });
                } else {
                    throw new Error("No video provided");
                }

                if (!processResponse.ok) {
                    const text = await processResponse.text();
                    let errorMessage = "Failed to ingest video";
                    try {
                        const data = JSON.parse(text);
                        if (data.error) errorMessage = data.error;
                    } catch {
                        errorMessage = `Server returned an error: ${processResponse.status} ${processResponse.statusText}. Response: ${text.substring(0, 100)}`;
                    }
                    throw new Error(errorMessage);
                }

                const processData = await processResponse.json();
                const jobId = processData.jobId;
                setJobId(jobId);

                if (!blobUrl && processData.blobUrl) {
                    blobUrl = processData.blobUrl;
                    setBlobUrl(blobUrl);
                }

                // Stages 1-3 handled by /api/transcribe
                setCurrentStage(1);

                const transcribeResponse = await fetch("/api/transcribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobId, apiKey, blobUrl }),
                });

                if (!transcribeResponse.ok) {
                    const text = await transcribeResponse.text();
                    let errorMessage = "Failed to transcribe audio";
                    try {
                        const data = JSON.parse(text);
                        if (data.error) errorMessage = data.error;
                    } catch {
                        errorMessage = `Server returned an error: ${transcribeResponse.status} ${transcribeResponse.statusText}. Response: ${text.substring(0, 100)}`;
                    }

                    if (transcribeResponse.status === 401) {
                        throw new Error("Missing Together AI API Key! Please enter it via the key icon at the top right, or set TOGETHER_API_KEY in your .env file.");
                    }
                    throw new Error(errorMessage);
                }

                const transcribeData = await transcribeResponse.json();
                setSrtContent(transcribeData.srtContent);
                setWords(transcribeData.words);

                if (!apiKey && !isSample) {
                    localStorage.setItem("substudio_free_used", "true");
                }

                setCurrentStage(4);

                setTimeout(() => {
                    onNext(jobId);
                }, 1000);

            } catch (err: unknown) {
                console.error("Processing caught error:", err);
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            }
        };

        processVideo();
    }, [videoFile, mediaUrl, isSample, onNext, onOutOfCredits, setBlobUrl, setJobId, setSrtContent, setWords]);

    const isComplete = currentStage >= stages.length;
    const isProcessing = currentStage < stages.length && !error;

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-0 pb-20 bg-background">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-md w-full space-y-10"
            >

                <motion.div variants={childFadeUp} className="text-center space-y-5">
                    {/* Main Hero Animation — different from stage spinners */}
                    <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {error === "out-of-credits" ? (
                                <motion.div
                                    key="credits"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                    className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center"
                                >
                                    <KeyRound className="w-10 h-10 text-amber-500" />
                                </motion.div>
                            ) : error ? (
                                <motion.div
                                    key="error"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                    className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center"
                                >
                                    <AlertCircle className="w-10 h-10 text-destructive" />
                                </motion.div>
                            ) : isComplete ? (
                                <motion.div
                                    key="complete"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                    className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center"
                                >
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="waveform"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex items-end justify-center gap-[5px] h-16"
                                    style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
                                >
                                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                                        <div
                                            key={i}
                                            className="w-[5px] rounded-full bg-primary/80"
                                            style={{
                                                animation: `waveform 1.2s ease-in-out ${i * 0.1}s infinite alternate`,
                                                height: '16px',
                                            }}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={error ? "error" : isComplete ? "done" : "processing"}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3 }}
                                className="text-2xl font-bold tracking-tight"
                            >
                                {error === "out-of-credits" ? "Free Credit Used" : error ? "Processing Failed" : isComplete ? "Ready!" : "Processing Video"}
                            </motion.h2>
                        </AnimatePresence>
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={error ? "err-msg" : isComplete ? "done-msg" : "proc-msg"}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.3, delay: 0.05 }}
                                className="text-muted-foreground text-base max-w-sm mx-auto"
                            >
                                {error === "out-of-credits"
                                    ? "Add a Together AI API key to keep creating subtitles — signing up is free and takes under a minute."
                                    : error
                                        ? error
                                        : isComplete
                                            ? "Opening editor..."
                                            : "Sit tight — our AI is analyzing your video..."}
                            </motion.p>
                        </AnimatePresence>

                        {/* Error action buttons */}
                        {error && error !== "out-of-credits" && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.15 }}
                                className="flex items-center justify-center gap-3 pt-2"
                            >
                                <button
                                    onClick={onReset}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Go Back & Try Again
                                </button>
                            </motion.div>
                        )}
                        {error === "out-of-credits" && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.15 }}
                                className="flex items-center justify-center gap-3 pt-2"
                            >
                                <button
                                    onClick={onReset}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted/50"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Go Back
                                </button>
                                <button
                                    onClick={onOutOfCredits}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    Add API Key
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {/* Together AI branding */}
                    <AnimatePresence>
                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="flex items-center justify-center gap-2"
                            >
                                <span className="text-xs text-muted-foreground/60">Powered by</span>
                                <Image
                                    src="/together-ai-new-logo.png"
                                    alt="Together AI"
                                    width={80}
                                    height={18}
                                    className="opacity-50 object-contain"
                                    style={{ height: 'auto' }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.div
                    variants={childFadeUp}
                    className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4"
                >
                    {stages.map((stage, index) => {
                        const isCompleted = currentStage > index;
                        const isCurrent = currentStage === index && !error;
                        const isPending = currentStage < index || (currentStage === index && error);

                        return (
                            <motion.div
                                key={stage.id}
                                variants={stageItemVariant}
                                className={cn(
                                    "flex items-center gap-4 transition-all duration-300",
                                    isPending && "opacity-40"
                                )}
                            >
                                <div className="shrink-0 flex items-center justify-center w-6 h-6">
                                    <AnimatePresence mode="wait">
                                        {isCompleted ? (
                                            <motion.div
                                                key="check"
                                                {...checkPop}
                                            >
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            </motion.div>
                                        ) : isCurrent ? (
                                            <motion.div
                                                key="pulse"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                                className="w-5 h-5 flex items-center justify-center"
                                            >
                                                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_2px] shadow-primary/30" />
                                            </motion.div>
                                        ) : error && currentStage === index ? (
                                            <motion.div
                                                key="error"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                            >
                                                <AlertCircle className="w-5 h-5 text-destructive" />
                                            </motion.div>
                                        ) : (
                                            <motion.div key="pending">
                                                <Circle className="w-5 h-5 text-muted-foreground border-transparent" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <span className={cn(
                                    "font-medium text-sm sm:text-base transition-colors duration-300",
                                    isCompleted ? "text-foreground" : isCurrent ? "text-primary" : error && currentStage === index ? "text-destructive" : "text-muted-foreground"
                                )}>
                                    {stage.label}
                                </span>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </motion.div>


        </div>
    );
}
