import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ListTodo, AlertTriangle, MonitorPlay, Download, FileText, FileVideo, ChevronDown, Loader2, CheckCircle2, Search, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subtitle {
    id: number;
    start: string;
    end: string;
    text: string;
    confidence: number;
}

interface EditorViewProps {
    onNewProject: () => void;
    jobId: string;
    srtContent: string;
    setSrtContent: (srt: string) => void;
    words: unknown[];
    stylePreset: string;
    setStylePreset: (style: string) => void;
}

function parseTime(timeStr: string): number {
    const [h, m, s_ms] = timeStr.split(':');
    if (!s_ms) return 0;
    const [s, ms] = s_ms.split(',');
    return (parseInt(h) * 3600) + (parseInt(m) * 60) + parseInt(s) + (parseInt(ms) / 1000);
}

function formatTime(seconds: number): string {
    const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
    const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
}

/* ── Animation variants ── */
const panelSlideLeft = {
    hidden: { opacity: 0, x: -24 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
};

const panelSlideRight = {
    hidden: { opacity: 0, x: 24 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
    },
};

const subtitleCardVariant = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function EditorView({ onNewProject, jobId, srtContent, setSrtContent, words: _words, stylePreset, setStylePreset }: EditorViewProps) {
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showReviewQueue, setShowReviewQueue] = useState(false);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Export dropdown state
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [exportSuccess, setExportSuccess] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const exportRef = useRef<HTMLDivElement>(null);

    // Search & copy state
    const [searchQuery, setSearchQuery] = useState("");
    const [copied, setCopied] = useState(false);

    const stylePresets = [
        { id: "classic", name: "Classic", desc: "Standard bottom text" },
        { id: "tiktok", name: "TikTok", desc: "Yellow highlights, word-by-word" },
        { id: "box", name: "Modern Box", desc: "Text with solid background" },
        { id: "cinematic", name: "Cinematic", desc: "Subtle drop shadow" },
        { id: "outline", name: "Outline", desc: "White text, black stroke" },
        { id: "bold-center", name: "Bold Center", desc: "Large centered, glow effect" },
    ];

    // Parse SRT
    useEffect(() => {
        if (!srtContent) return;
        const blocks = srtContent.trim().split(/\n\s*\n/);
        const parsed: Subtitle[] = blocks.map(block => {
            const lines = block.split('\n');
            const id = parseInt(lines[0]);
            const times = lines[1].split(' --> ');
            const text = lines.slice(2).join('\n');
            const confidence = Math.random() > 0.9 ? 0.7 : 0.95;
            return { id, start: times[0], end: times[1], text, confidence };
        });
        setSubtitles(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
    }, [srtContent]);

    // Close export dropdown on outside click / Escape
    useEffect(() => {
        if (!isExportOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
                setIsExportOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsExportOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [isExportOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;

            switch (e.key) {
                case " ":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "j":
                    if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
                    break;
                case "l":
                    if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
                    break;
                case "ArrowUp": {
                    e.preventDefault();
                    const idx = subtitles.findIndex(s => s.id === activeId);
                    if (idx > 0) {
                        const prev = subtitles[idx - 1];
                        setActiveId(prev.id);
                        if (videoRef.current) videoRef.current.currentTime = parseTime(prev.start);
                        document.getElementById(`sub-${prev.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                    break;
                }
                case "ArrowDown": {
                    e.preventDefault();
                    const idx = subtitles.findIndex(s => s.id === activeId);
                    if (idx < subtitles.length - 1) {
                        const next = subtitles[idx + 1];
                        setActiveId(next.id);
                        if (videoRef.current) videoRef.current.currentTime = parseTime(next.start);
                        document.getElementById(`sub-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                    break;
                }
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [activeId, subtitles, duration]);

    // Copy transcript to clipboard
    const handleCopyTranscript = async () => {
        const text = subtitles.map(s => s.text).join("\n");
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Filtered subtitles based on search
    const filteredSubtitles = subtitles.filter(s => {
        if (showReviewQueue && s.confidence >= 0.8) return false;
        if (searchQuery && !s.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // Stats
    const totalWords = subtitles.reduce((acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length, 0);
    const totalDurationSec = subtitles.length > 0
        ? parseTime(subtitles[subtitles.length - 1].end) - parseTime(subtitles[0].start)
        : 0;
    const statsMins = Math.floor(totalDurationSec / 60);
    const statsSecs = Math.floor(totalDurationSec % 60);

    // Handle Time Update
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);

        const active = subtitles.find(s => {
            const startStr = parseTime(s.start);
            const endStr = parseTime(s.end);
            return time >= startStr && time <= endStr;
        });

        if (active && active.id !== activeId) {
            setActiveId(active.id);
            const el = document.getElementById(`sub-${active.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const needsReviewCount = subtitles.filter(s => s.confidence < 0.8).length;

    // Get current subtitle text
    const currentSubtitle = subtitles.find(s => {
        const start = parseTime(s.start);
        const end = parseTime(s.end);
        return currentTime >= start && currentTime <= end;
    });

    const displayText = currentSubtitle?.text || "";

    // ---- Export Logic ----
    const downloadStringAsFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const convertSrtToVtt = (srt: string) => {
        let vtt = "WEBVTT\n\n";
        vtt += srt.replace(/,/g, '.');
        return vtt;
    };

    const syncSrtContent = () => {
        const newSrt = subtitles.map(s => `${s.id}\n${s.start} --> ${s.end}\n${s.text}\n`).join('\n');
        setSrtContent(newSrt);
        return newSrt;
    };

    const handleDownload = async (type: string) => {
        try {
            setDownloading(type);
            setExportError(null);
            setExportSuccess(null);

            const latestSrt = syncSrtContent();

            if (type === "srt") {
                downloadStringAsFile(latestSrt, `substudio_${jobId}.srt`, "text/plain");
                setExportSuccess("SRT downloaded!");
            }
            else if (type === "vtt") {
                const vttContent = convertSrtToVtt(latestSrt);
                downloadStringAsFile(vttContent, `substudio_${jobId}.vtt`, "text/vtt");
                setExportSuccess("VTT downloaded!");
            }
            else if (type === "mp4") {
                const res = await fetch("/api/burn", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobId, srtContent: latestSrt, stylePreset })
                });

                if (!res.ok) {
                    let errorMessage = "Failed to render video";
                    try {
                        const data = await res.json();
                        if (data.error) errorMessage = data.error;
                    } catch {
                        errorMessage = `Server error: ${res.status} ${res.statusText}`;
                    }
                    throw new Error(errorMessage);
                }

                // In production, burn API returns the video file directly as a stream
                // In dev, it returns JSON with an outputUrl
                const contentType = res.headers.get("content-type") || "";
                let blob: Blob;

                if (contentType.includes("video/")) {
                    blob = await res.blob();
                } else {
                    const data = await res.json();
                    const videoRes = await fetch(data.outputUrl);
                    if (!videoRes.ok) throw new Error("Failed to fetch rendered video");
                    blob = await videoRes.blob();
                }

                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = `substudio_${jobId}_captioned.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
                setExportSuccess("Video exported!");
            }

            setTimeout(() => setExportSuccess(null), 3000);
        } catch (err: unknown) {
            console.error("Export Error:", err);
            setExportError((err as Error).message || "An unknown error occurred");
        } finally {
            setDownloading(null);
        }
    };

    const videoUrl = jobId ? `/api/video?jobId=${jobId}` : '';

    // --- Style-dependent subtitle rendering ---
    const renderSubtitleOverlay = () => {
        if (!displayText) return null;

        switch (stylePreset) {
            case "classic":
                return (
                    <div className="absolute bottom-14 left-0 right-0 flex justify-center z-10 px-8 pointer-events-none">
                        <div className="bg-black/80 px-5 py-2 rounded text-center max-w-[90%]">
                            <span className="text-white font-normal text-sm lg:text-base leading-snug tracking-wide" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                                {displayText}
                            </span>
                        </div>
                    </div>
                );

            case "tiktok":
                return (
                    <div className="absolute bottom-1/3 left-0 right-0 flex justify-center z-10 px-6 pointer-events-none">
                        <div className="text-center max-w-[85%]">
                            <span className="text-white font-extrabold text-lg lg:text-2xl uppercase leading-tight" style={{
                                textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
                                letterSpacing: "0.04em",
                            }}>
                                {displayText}
                            </span>
                        </div>
                    </div>
                );

            case "box":
                return (
                    <div className="absolute bottom-14 left-0 right-0 flex justify-center z-10 px-8 pointer-events-none">
                        <div className="bg-white px-5 py-2 rounded-lg text-center shadow-lg max-w-[90%]">
                            <span className="text-black font-semibold text-sm lg:text-base leading-snug tracking-wide">
                                {displayText}
                            </span>
                        </div>
                    </div>
                );

            case "cinematic":
                return (
                    <div className="absolute bottom-14 left-0 right-0 flex justify-center z-10 px-8 pointer-events-none">
                        <div className="text-center max-w-[90%]">
                            <span className="text-white/90 font-light text-sm lg:text-lg tracking-widest italic leading-relaxed" style={{
                                textShadow: "0 2px 12px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)",
                                letterSpacing: "0.1em",
                            }}>
                                {displayText}
                            </span>
                        </div>
                    </div>
                );

            case "outline":
                return (
                    <div className="absolute bottom-14 left-0 right-0 flex justify-center z-10 px-8 pointer-events-none">
                        <div className="text-center max-w-[90%]">
                            <span className="text-white font-bold text-sm lg:text-base leading-snug tracking-wide" style={{
                                WebkitTextStroke: "1.5px black",
                                paintOrder: "stroke fill",
                                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                            }}>
                                {displayText}
                            </span>
                        </div>
                    </div>
                );

            case "bold-center":
                return (
                    <div className="absolute inset-0 flex items-center justify-center z-10 px-6 pointer-events-none">
                        <div className="text-center max-w-[80%]">
                            <span className="text-white font-black text-xl lg:text-3xl uppercase leading-none tracking-tight" style={{
                                WebkitTextStroke: "2px rgba(0,0,0,0.6)",
                                paintOrder: "stroke fill",
                                textShadow: "0 0 20px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.8)",
                            }}>
                                {displayText}
                            </span>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex-1 flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Panel: Video Player */}
            <motion.div
                variants={panelSlideLeft}
                initial="hidden"
                animate="visible"
                className="flex-[3] flex flex-col border-r bg-card/30 relative"
            >
                <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        className="w-full max-w-4xl aspect-video bg-black rounded-lg shadow-xl overflow-hidden relative flex items-center justify-center group ring-1 ring-border"
                    >
                        {videoUrl ? (
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="w-full h-full object-contain"
                                onTimeUpdate={handleTimeUpdate}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                                onClick={togglePlay}
                            />
                        ) : (
                            <MonitorPlay className="w-24 h-24 text-muted-foreground/30 absolute z-0" />
                        )}

                        {/* Subtitle Overlay — style-aware */}
                        {renderSubtitleOverlay()}

                        {/* Video Controls overlay on hover */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
                            <div className="flex items-center gap-4 text-white">
                                <button onClick={togglePlay} className="hover:text-primary transition-colors">
                                    {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
                                </button>
                                <input
                                    type="range"
                                    min={0}
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer accent-primary"
                                />
                                <span className="text-xs font-medium tabular-nums text-white/80">
                                    {formatTime(currentTime).slice(3, -4)} / {formatTime(duration).slice(3, -4)}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Style Selection Below Video */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                    className="p-6 border-t bg-card/50"
                >
                    <h3 className="font-medium text-foreground text-sm mb-3">Subtitle Style</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {stylePresets.map((preset) => (
                            <motion.button
                                key={preset.id}
                                onClick={() => setStylePreset(preset.id)}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                className={cn(
                                    "p-3 text-left rounded-xl border transition-all duration-200",
                                    stylePreset === preset.id
                                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                                        : "border-border hover:border-primary/40 hover:bg-muted/30 focus:outline-none"
                                )}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-xs">{preset.name}</span>
                                    <AnimatePresence>
                                        {stylePreset === preset.id && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                                className="w-2 h-2 rounded-full bg-primary"
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                                <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.desc}</span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </motion.div>

            {/* Right Panel: Editor */}
            <motion.div
                variants={panelSlideRight}
                initial="hidden"
                animate="visible"
                className="flex-[2] flex flex-col bg-background min-w-[400px] h-full overflow-hidden"
            >
                {/* Editor Toolbar */}
                <div className="border-b shrink-0 bg-card">
                    <div className="h-14 flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowReviewQueue(!showReviewQueue)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
                                    showReviewQueue ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
                                )}
                            >
                                <ListTodo className="w-4 h-4" />
                                Review
                                {needsReviewCount > 0 && (
                                    <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full min-w-4 text-center">
                                        {needsReviewCount}
                                    </span>
                                )}
                            </button>
                            {subtitles.length > 0 && (
                                <span className="text-[11px] text-muted-foreground/60 font-mono tabular-nums ml-1 hidden lg:inline">
                                    {subtitles.length} subs · {totalWords} words · {statsMins}m {String(statsSecs).padStart(2, "0")}s
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Copy transcript */}
                            <motion.button
                                onClick={handleCopyTranscript}
                                whileTap={{ scale: 0.95 }}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                                title="Copy transcript"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </motion.button>

                            {/* Export Button with Dropdown */}
                            <div className="relative" ref={exportRef}>
                                <motion.button
                                    onClick={() => setIsExportOpen(!isExportOpen)}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                        "text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all",
                                        isExportOpen
                                            ? "bg-foreground text-background shadow-lg"
                                            : "bg-foreground text-background hover:bg-foreground/90"
                                    )}
                                >
                                    <Download className="w-4 h-4" />
                                    Export
                                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isExportOpen && "rotate-180")} />
                                </motion.button>

                        <AnimatePresence>
                            {isExportOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                    className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                                >
                                    {/* Success / Error banner */}
                                    <AnimatePresence>
                                        {exportSuccess && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="px-4 py-2.5 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2 text-green-500"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-sm font-medium">{exportSuccess}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <AnimatePresence>
                                        {exportError && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="px-4 py-2.5 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-destructive"
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="text-sm font-medium truncate">{exportError}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="py-1">
                                        {/* SRT Download */}
                                        <button
                                            onClick={() => handleDownload("srt")}
                                            disabled={downloading !== null}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">Download SRT</p>
                                                <p className="text-[11px] text-muted-foreground">Universal — YouTube, Premiere, etc.</p>
                                            </div>
                                            {downloading === "srt" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                        </button>

                                        {/* VTT Download */}
                                        <button
                                            onClick={() => handleDownload("vtt")}
                                            disabled={downloading !== null}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 text-purple-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">Download VTT</p>
                                                <p className="text-[11px] text-muted-foreground">Web-ready — HTML5 players</p>
                                            </div>
                                            {downloading === "vtt" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                        </button>

                                        <div className="mx-4 my-1 border-t border-border/50" />

                                        {/* Burned MP4 */}
                                        <button
                                            onClick={() => handleDownload("mp4")}
                                            disabled={downloading !== null}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <FileVideo className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">Export Burned-in MP4</p>
                                                <p className="text-[11px] text-muted-foreground">Video with baked subtitles — for social media</p>
                                            </div>
                                            {downloading === "mp4" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Search bar */}
                    {subtitles.length > 0 && (
                        <div className="px-4 py-2 border-t border-border/40">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Search subtitles..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/30 border border-border/50 rounded-lg outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all text-foreground placeholder:text-muted-foreground/40"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Subtitle List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredSubtitles.map((sub, index) => {
                        const isLong = sub.text.length > 50;
                        const needsReview = sub.confidence < 0.8;

                        return (
                            <motion.div
                                id={`sub-${sub.id}`}
                                key={sub.id}
                                variants={subtitleCardVariant}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: Math.min(index * 0.03, 0.6) }}
                                onClick={() => {
                                    setActiveId(sub.id);
                                    if (videoRef.current) videoRef.current.currentTime = parseTime(sub.start);
                                }}
                                className={cn(
                                    "p-4 rounded-xl border transition-all duration-200 cursor-text group",
                                    activeId === sub.id
                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                                        : "border-border hover:border-border/80 bg-card"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground mr-1">
                                            {sub.id}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono tabular-nums">
                                            {sub.start.slice(3, -4)} - {sub.end.slice(3, -4)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {needsReview && (
                                            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                                Review
                                            </span>
                                        )}
                                        {isLong && (
                                            <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded" title="Long subtitle">
                                                Long
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <textarea
                                    className={cn(
                                        "w-full bg-transparent resize-none outline-none leading-relaxed transition-colors duration-200",
                                        activeId === sub.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"
                                    )}
                                    rows={2}
                                    value={sub.text}
                                    onChange={(e) => {
                                        const newSubs = subtitles.map(s =>
                                            s.id === sub.id ? { ...s, text: e.target.value } : s
                                        );
                                        setSubtitles(newSubs);
                                    }}
                                />
                            </motion.div>
                        );
                    })}

                    {filteredSubtitles.length === 0 && searchQuery && (
                        <div className="text-center py-12 text-muted-foreground/50">
                            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                            <p className="text-sm font-medium">No subtitles match &ldquo;{searchQuery}&rdquo;</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
