import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessingViewProps {
    onNext: () => void;
    videoFile: File | null;
    youtubeUrl: string;
    setJobId: (id: string) => void;
    setSrtContent: (srt: string) => void;
    setWords: (words: any[]) => void;
}

export default function ProcessingView({ onNext, videoFile, youtubeUrl, setJobId, setSrtContent, setWords }: ProcessingViewProps) {
    const [currentStage, setCurrentStage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const hasStarted = useRef(false);

    const stages = [
        { id: "ingest", label: "Ingesting video" },
        { id: "extract", label: "Extracting audio" },
        { id: "transcribe", label: "Transcribing with AI (Together AI)" },
        { id: "format", label: "Formatting subtitles" },
    ];

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        const processVideo = async () => {
            try {
                const apiKey = localStorage.getItem("substudio_together_api_key") || "";
                const freeUsed = localStorage.getItem("substudio_free_used") === "true";

                if (!apiKey && freeUsed) {
                    throw new Error("Free generation used! Please click the Key icon (top right) to enter your Together API Key.");
                }

                setError(null);
                setCurrentStage(0);

                // Stage 0: Ingest Video
                let processResponse;
                if (videoFile) {
                    const formData = new FormData();
                    formData.append("file", videoFile);
                    processResponse = await fetch("/api/process", {
                        method: "POST",
                        body: formData,
                    });
                } else if (youtubeUrl) {
                    processResponse = await fetch("/api/process", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ youtubeUrl }),
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
                    } catch (e) {
                        errorMessage = `Server returned an error: ${processResponse.status} ${processResponse.statusText}. Response: ${text.substring(0, 100)}`;
                    }
                    throw new Error(errorMessage);
                }

                const processData = await processResponse.json();
                const jobId = processData.jobId;
                setJobId(jobId);

                // Stages 1-3 handled by /api/transcribe
                setCurrentStage(1);

                const transcribeResponse = await fetch("/api/transcribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobId, apiKey }),
                });

                if (!transcribeResponse.ok) {
                    const text = await transcribeResponse.text();
                    let errorMessage = "Failed to transcribe audio";
                    try {
                        const data = JSON.parse(text);
                        if (data.error) errorMessage = data.error;
                    } catch (e) {
                        errorMessage = `Server returned an error: ${transcribeResponse.status} ${transcribeResponse.statusText}. Response: ${text.substring(0, 100)}`;
                    }

                    if (transcribeResponse.status === 401) {
                        throw new Error("Missing Together AI API Key! Please enter it via the gear icon at the top right, or set TOGETHER_API_KEY in your .env.local file.");
                    }
                    throw new Error(errorMessage);
                }

                const transcribeData = await transcribeResponse.json();
                setSrtContent(transcribeData.srtContent);
                setWords(transcribeData.words);

                if (!apiKey) {
                    localStorage.setItem("substudio_free_used", "true");
                }

                setCurrentStage(4);

                // Wait a moment then go to editor
                setTimeout(() => {
                    onNext();
                }, 1000);

            } catch (err: any) {
                console.error("Processing caught error:", err);
                setError(err.message || "An unknown error occurred");
            }
        };

        processVideo();
    }, [videoFile, youtubeUrl, setJobId, setSrtContent, setWords, onNext]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
            <div className="max-w-md w-full space-y-10 animate-in fade-in zoom-in-95 duration-500">

                <div className="text-center space-y-4">
                    <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                        {error ? (
                            <AlertCircle className="w-16 h-16 text-destructive animate-in zoom-in duration-300" />
                        ) : currentStage < stages.length ? (
                            <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-16 h-16 text-green-500 animate-in zoom-in duration-300" />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {error ? "Processing Failed" : currentStage < stages.length ? "Processing Video" : "Ready!"}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        {error
                            ? error
                            : currentStage < stages.length
                                ? "This usually takes a few moments..."
                                : "Opening editor..."}
                    </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                    {stages.map((stage, index) => {
                        const isCompleted = currentStage > index;
                        const isCurrent = currentStage === index && !error;
                        const isPending = currentStage < index || (currentStage === index && error);

                        return (
                            <div
                                key={stage.id}
                                className={cn(
                                    "flex items-center gap-4 transition-all duration-300",
                                    isPending && "opacity-40"
                                )}
                            >
                                <div className="shrink-0 flex items-center justify-center w-6 h-6">
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : isCurrent ? (
                                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                    ) : error && currentStage === index ? (
                                        <AlertCircle className="w-5 h-5 text-destructive" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground border-transparent" />
                                    )}
                                </div>
                                <span className={cn(
                                    "font-medium text-sm sm:text-base",
                                    isCompleted ? "text-foreground" : isCurrent ? "text-primary" : error && currentStage === index ? "text-destructive" : "text-muted-foreground"
                                )}>
                                    {stage.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
