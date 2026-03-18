"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ImportView from "./ImportView";
import ProcessingView from "./ProcessingView";
import EditorView from "./EditorView";
import Logo from "./Logo";
import ApiKeyModal from "./ApiKeyModal";
import Image from "next/image";
import { KeyRound, History, Check, CircleDot, Circle, Trash2, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import Tooltip from "./Tooltip";

export type AppStep = "import" | "processing" | "editor";

export interface HistoryEntry {
    id: string;
    title: string;
    date: string;
    stylePreset: string;
}

const TOGETHER_TIPS = [
    "Powered by Together AI — the fastest inference cloud",
    "Together AI runs Whisper Large v3 up to 15× faster than alternatives",
    "Together AI — 200+ open-source models, one simple API",
    "Build with Llama, Mixtral, Whisper & more on Together AI",
    "From prototype to production at any scale — together.ai",
    "The leading cloud platform for open-source AI inference",
    "Together AI — Build, fine-tune, and scale generative AI",
];

/* ── Framer Motion page transition variants ── */
const pageVariants = {
    initial: { opacity: 0, scale: 0.97, filter: "blur(6px)" },
    animate: {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: {
        opacity: 0,
        scale: 0.97,
        filter: "blur(6px)",
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
    },
};

export default function SubStudioApp() {
    const [step, setStep] = useState<AppStep>("import");
    const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

    // Toast state
    const [tipIndex, setTipIndex] = useState(0);
    const [tipVisible, setTipVisible] = useState(true);



    // Shared state
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState<string>("");
    const [jobId, setJobId] = useState<string>("");
    const [srtContent, setSrtContent] = useState<string>("");
    const [words, setWords] = useState<unknown[]>([]);
    const [stylePreset, setStylePreset] = useState<string>("tiktok");

    const historyRef = useRef<HTMLDivElement>(null);

    // Load history from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("substudio_history");
        if (stored) {
            try {
                setHistoryEntries(JSON.parse(stored));
            } catch { /* ignore parse errors */ }
        }
    }, []);



    // Auto-rotate tips every 6 seconds — only when on processing step
    useEffect(() => {
        if (step !== "processing") return;
        const interval = setInterval(() => {
            cycleTip();
        }, 6000);
        return () => clearInterval(interval);
    }, [tipIndex, step]);

    const cycleTip = () => {
        setTipVisible(false);
        setTimeout(() => {
            setTipIndex((prev) => (prev + 1) % TOGETHER_TIPS.length);
            setTipVisible(true);
        }, 300);
    };

    // Close history on outside click or Escape
    useEffect(() => {
        if (!isHistoryOpen) return;

        const handleClick = (e: MouseEvent) => {
            if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
                setIsHistoryOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsHistoryOpen(false);
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [isHistoryOpen]);

    const saveToHistory = (jId: string, source: string) => {
        const entry: HistoryEntry = {
            id: jId,
            title: source || "Untitled project",
            date: new Date().toISOString(),
            stylePreset,
        };
        const updated = [entry, ...historyEntries].slice(0, 50);
        setHistoryEntries(updated);
        localStorage.setItem("substudio_history", JSON.stringify(updated));
    };

    const clearHistory = () => {
        setHistoryEntries([]);
        localStorage.removeItem("substudio_history");
    };

    const resetApp = () => {
        setVideoFile(null);
        setYoutubeUrl("");
        setJobId("");
        setSrtContent("");
        setWords([]);
        setStylePreset("tiktok");
        setStep("import");
    };

    const handleProcessingComplete = () => {
        const source = videoFile?.name || youtubeUrl || "Unknown";
        saveToHistory(jobId, source);
        setStep("editor");
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };



    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden font-sans">
            {/* Nav Bar */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-14 border-b border-border/60 flex items-center px-5 shrink-0 justify-between bg-card/80 backdrop-blur-xl text-card-foreground z-30 relative"
            >
                {/* Left — SubStudio + Together AI */}
                <div className="flex items-center gap-3">
                    {/* SubStudio logo + name */}
                    <button onClick={resetApp} className="flex items-center gap-[6px] hover:opacity-80 transition-opacity">
                        <div className="w-7 h-7 flex items-center justify-center">
                            <Logo />
                        </div>
                        <h1 className="text-[17px] tracking-tight" style={{ fontFamily: "var(--font-outfit), 'Inter', sans-serif", fontWeight: 500 }}>SubStudio</h1>
                    </button>

                    {/* Separator + Together AI logo */}
                    <div className="flex items-center gap-3 pl-3 border-l border-border/50">
                        <a
                            href="https://together.ai"
                            target="_blank"
                            rel="noreferrer"
                            className="hover:opacity-80 transition-opacity"
                            title="Built with Together AI"
                        >
                            <Image
                                src="/together-ai-new-logo.png"
                                alt="Together AI"
                                width={90}
                                height={20}
                                className="object-contain"
                                style={{ height: 'auto' }}
                            />
                        </a>
                    </div>
                </div>

                {/* Center — Step Indicator */}
                <AnimatePresence>
                    {step !== "import" && (
                        <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
                                className="flex items-center gap-1 pointer-events-auto"
                            >
                                <NavStepPill current={step} target="processing" label="Transcribe" />
                                <div className="w-4 h-px bg-border/60 mx-0.5" />
                                <NavStepPill current={step} target="editor" label="Edit & Export" />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Right actions */}
                <div className="flex items-center gap-1.5">
                    {/* New Generation button — only on editor step */}
                    <AnimatePresence>
                        {step === "editor" && (
                            <Tooltip label="New Generation">
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={resetApp}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
                                >
                                    <Plus className="w-[18px] h-[18px]" />
                                </motion.button>
                            </Tooltip>
                        )}
                    </AnimatePresence>
                    {/* History Dropdown */}
                    <div className="relative flex items-center" ref={historyRef}>
                        <Tooltip label="Upload History">
                            <button
                                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                className={cn(
                                    "p-2 rounded-lg transition-all duration-200",
                                    isHistoryOpen
                                        ? "text-foreground bg-muted shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                            >
                                <History className="w-[18px] h-[18px]" />
                            </button>
                        </Tooltip>

                        <AnimatePresence>
                            {isHistoryOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                    className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                        <h3 className="font-semibold text-sm text-foreground">History</h3>
                                        {historyEntries.length > 0 && (
                                            <button
                                                onClick={clearHistory}
                                                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                                        {historyEntries.length === 0 ? (
                                            <div className="px-4 py-10 text-center text-muted-foreground">
                                                <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                                                <p className="text-sm font-medium">No history yet</p>
                                                <p className="text-xs mt-1 opacity-70">Your projects will appear here</p>
                                            </div>
                                        ) : (
                                            <div className="py-1">
                                                {historyEntries.map((entry, i) => (
                                                    <div
                                                        key={`${entry.id}-${i}`}
                                                        className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-default border-b border-border/30 last:border-b-0"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-foreground truncate">
                                                                    {entry.title}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                        {entry.stylePreset}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {formatDate(entry.date)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Tooltip label="API Key Settings">
                        <button
                            onClick={() => setIsApiKeyOpen(true)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-all duration-200"
                        >
                            <KeyRound className="w-[18px] h-[18px]" />
                        </button>
                    </Tooltip>

                    <Tooltip label="Star on GitHub">
                        <a
                            href="https://github.com/Luffixos/ai-subtitles"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all duration-200 group"
                        >
                            <svg viewBox="0 0 16 16" className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                            </svg>
                            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">GitHub</span>
                        </a>
                    </Tooltip>
                </div>
            </motion.header>

            <main className="flex-1 overflow-auto flex relative">
                <AnimatePresence mode="wait">
                    {step === "import" && (
                        <motion.div
                            key="import"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="flex-1 flex"
                        >
                            <ImportView
                                onNext={() => setStep("processing")}
                                setVideoFile={setVideoFile}
                                setYoutubeUrl={setYoutubeUrl}
                            />
                        </motion.div>
                    )}
                    {step === "processing" && (
                        <motion.div
                            key="processing"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="flex-1 flex"
                        >
                            <ProcessingView
                                onNext={handleProcessingComplete}
                                videoFile={videoFile}
                                youtubeUrl={youtubeUrl}
                                setJobId={setJobId}
                                setSrtContent={setSrtContent}
                                setWords={setWords}
                            />
                        </motion.div>
                    )}
                    {step === "editor" && (
                        <motion.div
                            key="editor"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="flex-1 flex"
                        >
                            <EditorView
                                onNewProject={resetApp}
                                jobId={jobId}
                                srtContent={srtContent}
                                setSrtContent={setSrtContent}
                                words={words}
                                stylePreset={stylePreset}
                                setStylePreset={setStylePreset}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Together AI Toast — Only during processing */}
            <AnimatePresence>
                {step === "processing" && (
                    <div className="fixed bottom-5 left-0 right-0 z-40 flex justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
                            className="pointer-events-auto"
                        >
                            <button
                                onClick={cycleTip}
                                className="group flex items-center gap-2.5 bg-card/90 backdrop-blur-xl border border-border/60 shadow-lg hover:shadow-xl px-4 py-2.5 rounded-full transition-all duration-300 hover:border-border cursor-pointer"
                            >
                                <Image
                                    src="/together-logo-solo.svg"
                                    alt="Together AI"
                                    width={16}
                                    height={16}
                                    className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                                    style={{ height: 'auto' }}
                                />
                                <span
                                    className={cn(
                                        "text-xs font-medium text-muted-foreground group-hover:text-foreground whitespace-nowrap transition-all duration-300",
                                        tipVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                                    )}
                                >
                                    {TOGETHER_TIPS[tipIndex]}
                                </span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ApiKeyModal isOpen={isApiKeyOpen} onClose={() => setIsApiKeyOpen(false)} />
        </div>
    );
}

/* Step pill inside nav bar — icon only on mobile (hidden via parent), icon + label on desktop */
function NavStepPill({ current, target, label }: {
    current: AppStep;
    target: AppStep;
    label: string;
}) {
    const stepOrder: AppStep[] = ["processing", "editor"];
    const currentIndex = stepOrder.indexOf(current);
    const targetIndex = stepOrder.indexOf(target);

    const isPast = targetIndex < currentIndex;
    const isCurrent = current === target;

    return (
        <div
            className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 text-xs font-semibold",
                isCurrent
                    ? "bg-foreground text-background"
                    : isPast
                        ? "bg-muted/60 text-foreground"
                        : "text-muted-foreground"
            )}
        >
            <div className="w-3.5 h-3.5 flex items-center justify-center">
                {isPast ? (
                    <Check className="w-3 h-3" />
                ) : isCurrent ? (
                    <CircleDot className="w-3 h-3" />
                ) : (
                    <Circle className="w-3 h-3" />
                )}
            </div>
            <span>{label}</span>
        </div>
    );
}
