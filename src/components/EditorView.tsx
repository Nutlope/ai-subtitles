import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ListTodo, AlertTriangle, MonitorPlay, Download, ChevronDown, Loader2, CheckCircle2, Search, Copy, Check } from "lucide-react";
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
    isSample?: boolean;
    blobUrl?: string | null;
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
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const panelSlideRight = {
    hidden: { opacity: 0, x: 24 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay: 0.1 },
    },
};

const subtitleCardVariant = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
    },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function EditorView({ onNewProject: _onNewProject, jobId, srtContent, setSrtContent, words: _words, stylePreset, setStylePreset, isSample, blobUrl }: EditorViewProps) {
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showReviewQueue, setShowReviewQueue] = useState(false);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [nearestId, setNearestId] = useState<number | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Export dropdown state
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [burnProgress, setBurnProgress] = useState<{ stage: string; progress: number } | null>(null);

    // Toast notifications
    const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' }>>([]);
    const toastId = useRef(0);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = ++toastId.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    // Video info & enhancement
    const [videoHeight, setVideoHeight] = useState<number>(0);
    const [upscaleTarget, setUpscaleTarget] = useState<number | null>(null);
    const [videoError, setVideoError] = useState(false);

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

    // Get video resolution client-side from the <video> element
    const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (video.videoHeight > 0) setVideoHeight(video.videoHeight);
    };

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

    // Filtered subtitles based on search
    const filteredSubtitles = subtitles.filter(s => {
        if (showReviewQueue && s.confidence >= 0.8) return false;
        if (searchQuery && !s.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

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
                    const idx = filteredSubtitles.findIndex(s => s.id === activeId);
                    if (idx > 0) {
                        const prev = filteredSubtitles[idx - 1];
                        setActiveId(prev.id);
                        if (videoRef.current) videoRef.current.currentTime = parseTime(prev.start);
                        document.getElementById(`sub-${prev.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                    break;
                }
                case "ArrowDown": {
                    e.preventDefault();
                    const idx = filteredSubtitles.findIndex(s => s.id === activeId);
                    if (idx < filteredSubtitles.length - 1) {
                        const next = filteredSubtitles[idx + 1];
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
    }, [activeId, filteredSubtitles, duration]);

    // Copy transcript to clipboard
    const handleCopyTranscript = async () => {
        const text = filteredSubtitles.map(s => s.text).join("\n");
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

        const active = filteredSubtitles.find(s => {
            const startStr = parseTime(s.start);
            const endStr = parseTime(s.end);
            return time >= startStr && time <= endStr;
        });

        if (active) {
            if (active.id !== activeId) {
                setActiveId(active.id);
                setNearestId(null);
                const el = document.getElementById(`sub-${active.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else if (filteredSubtitles.length > 0) {
            // No exact match — find the closest filtered subtitle
            setActiveId(null);
            let closest = filteredSubtitles[0];
            let closestDist = Infinity;
            for (const s of filteredSubtitles) {
                const start = parseTime(s.start);
                const end = parseTime(s.end);
                const mid = (start + end) / 2;
                const dist = Math.abs(time - mid);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = s;
                }
            }
            if (closest.id !== nearestId) {
                setNearestId(closest.id);
                const el = document.getElementById(`sub-${closest.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
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

    // Word-level highlight index for TikTok style
    const getHighlightedWordIndex = (sub: Subtitle, time: number): number => {
        const start = parseTime(sub.start);
        const end = parseTime(sub.end);
        const dur = end - start;
        if (dur <= 0) return 0;
        const progress = (time - start) / dur;
        const words = sub.text.split(/\s+/);
        return Math.min(Math.floor(progress * words.length), words.length - 1);
    };

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

            const latestSrt = syncSrtContent();

            if (type === "srt") {
                downloadStringAsFile(latestSrt, `substudio_${jobId}.srt`, "text/plain");
                showToast("SRT downloaded!");
            }
            else if (type === "vtt") {
                const vttContent = convertSrtToVtt(latestSrt);
                downloadStringAsFile(vttContent, `substudio_${jobId}.vtt`, "text/vtt");
                showToast("VTT downloaded!");
            }
            else if (type === "mp4") {
                setBurnProgress({ stage: "preparing", progress: 0 });

                const res = await fetch("/api/burn", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobId, srtContent: latestSrt, stylePreset, targetHeight: upscaleTarget, isSample, blobUrl })
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

                // Read streaming response: JSON progress lines, then binary video after {"done":true}
                const reader = res.body!.getReader();
                let buffer = new Uint8Array(0);
                let binaryMode = false;
                const binaryChunks: Uint8Array[] = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    if (binaryMode) {
                        binaryChunks.push(value);
                        continue;
                    }

                    // Append chunk to buffer
                    const newBuffer = new Uint8Array(buffer.length + value.length);
                    newBuffer.set(buffer);
                    newBuffer.set(value, buffer.length);
                    buffer = newBuffer;

                    // Scan for newlines (0x0A) to extract JSON progress lines
                    while (true) {
                        const nlIndex = buffer.indexOf(0x0A);
                        if (nlIndex === -1) break;

                        const lineBytes = buffer.slice(0, nlIndex);
                        buffer = buffer.slice(nlIndex + 1);

                        const line = new TextDecoder().decode(lineBytes).trim();
                        if (!line) continue;

                        try {
                            const data = JSON.parse(line);
                            if (data.done) {
                                binaryMode = true;
                                if (buffer.length > 0) binaryChunks.push(buffer);
                                break;
                            }
                            if (data.stage === "error") throw new Error(data.message || "Encoding failed");
                            setBurnProgress({ stage: data.stage || "encoding", progress: data.progress ?? 0 });
                        } catch (e) {
                            if (e instanceof SyntaxError) continue;
                            throw e;
                        }
                    }
                }

                const blob = new Blob(binaryChunks as BlobPart[], { type: "video/mp4" });
                if (blob.size === 0) throw new Error("Encoded video is empty");

                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = `substudio_${jobId}_captioned.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
                showToast("Video exported!");
                setBurnProgress(null);
            }
        } catch (err: unknown) {
            console.error("Export Error:", err);
            showToast((err as Error).message || "An unknown error occurred", 'error');
        } finally {
            setDownloading(null);
            setBurnProgress(null);
        }
    };

    const videoUrl = isSample ? '/sample-demo.mp4' : jobId ? `/api/video?jobId=${jobId}${blobUrl ? `&blobUrl=${encodeURIComponent(blobUrl)}` : ''}` : '';

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

            case "tiktok": {
                const words = displayText.split(/\s+/);
                const highlightIdx = currentSubtitle ? getHighlightedWordIndex(currentSubtitle, currentTime) : 0;
                return (
                    <div className="absolute bottom-1/3 left-0 right-0 flex justify-center z-10 px-6 pointer-events-none">
                        <div className="text-center max-w-[85%] flex flex-wrap justify-center gap-x-2 gap-y-1">
                            {words.map((word, i) => (
                                <span
                                    key={i}
                                    className={cn(
                                        "font-extrabold text-lg lg:text-2xl uppercase leading-tight transition-all duration-150",
                                        i === highlightIdx
                                            ? "text-black bg-[#FACC15] px-1.5 py-0.5 rounded-md"
                                            : "text-white"
                                    )}
                                    style={{
                                        textShadow: i !== highlightIdx ? "0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)" : "none",
                                        letterSpacing: "0.04em",
                                    }}
                                >
                                    {word}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            }

            case "box":
                return (
                    <div className="absolute bottom-14 left-0 right-0 flex justify-center z-10 px-8 pointer-events-none">
                        <div className="bg-white px-5 py-2 text-center shadow-lg max-w-[90%]">
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
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Panel: Video Player */}
            <motion.div
                variants={panelSlideLeft}
                initial="hidden"
                animate="visible"
                className="md:flex-[3] flex flex-col border-b md:border-b-0 md:border-r bg-card/30 relative"
            >
                <div className="flex-1 p-3 sm:p-6 flex flex-col items-center justify-center relative">
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
                                aria-label="Video player"
                                className="w-full h-full object-contain"
                                onTimeUpdate={handleTimeUpdate}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); handleVideoMetadata(e); }}
                                onError={() => setVideoError(true)}
                                onClick={togglePlay}
                            />
                        ) : (
                            <MonitorPlay className="w-24 h-24 text-muted-foreground/30 absolute z-0" />
                        )}

                        {/* Video expired overlay */}
                        {videoError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white/70 text-center p-6 z-20">
                                <MonitorPlay className="w-16 h-16 mb-3 opacity-40" />
                                <p className="text-sm font-medium">Video session expired</p>
                                <p className="text-xs text-white/40 mt-1">Subtitle data is still available — export as SRT or VTT</p>
                            </div>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
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
                className="md:flex-[2] flex flex-col bg-background md:min-w-[320px] h-full overflow-hidden"
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
                                        "text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all relative overflow-hidden",
                                        isExportOpen
                                            ? "bg-foreground text-background shadow-lg"
                                            : "bg-foreground text-background hover:bg-foreground/90"
                                    )}
                                >
                                    {burnProgress && downloading === "mp4" ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>{burnProgress.stage === "encoding" ? `${Math.round(burnProgress.progress)}%` : burnProgress.stage === "preparing" ? "Preparing…" : "Finalizing…"}</span>
                                            <motion.div
                                                className="absolute bottom-0 left-0 h-0.5 bg-background/30"
                                                initial={{ width: "0%" }}
                                                animate={{ width: `${burnProgress.stage === "preparing" ? 5 : burnProgress.progress}%` }}
                                                transition={{ duration: 0.3, ease: "easeOut" }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Export
                                            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isExportOpen && "rotate-180")} />
                                        </>
                                    )}
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
                                    <div className="py-1">
                                        {/* SRT Download */}
                                        <motion.button
                                            onClick={() => handleDownload("srt")}
                                            disabled={downloading !== null}
                                            whileTap={{ scale: 0.97, backgroundColor: "rgba(128,128,128,0.1)" }}
                                            transition={{ duration: 0.1 }}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <rect x="2" y="4" width="20" height="16" rx="3" stroke="url(#srt-grad)" strokeWidth="2" />
                                                    <text x="12" y="14.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="url(#srt-grad)">CC</text>
                                                    <defs>
                                                        <linearGradient id="srt-grad" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                                                            <stop stopColor="#3B82F6" /><stop offset="1" stopColor="#06B6D4" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">Download SRT</p>
                                                <p className="text-[11px] text-muted-foreground">Universal — YouTube, Premiere, etc.</p>
                                            </div>
                                            {downloading === "srt" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                        </motion.button>

                                        {/* VTT Download */}
                                        <motion.button
                                            onClick={() => handleDownload("vtt")}
                                            disabled={downloading !== null}
                                            whileTap={{ scale: 0.97, backgroundColor: "rgba(128,128,128,0.1)" }}
                                            transition={{ duration: 0.1 }}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M4 7l4 5-4 5" stroke="url(#vtt-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M20 7l-4 5 4 5" stroke="url(#vtt-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <rect x="9" y="10" width="6" height="2" rx="1" fill="url(#vtt-grad)" />
                                                    <rect x="10" y="14" width="4" height="1.5" rx="0.75" fill="url(#vtt-grad)" opacity="0.5" />
                                                    <defs>
                                                        <linearGradient id="vtt-grad" x1="4" y1="7" x2="20" y2="17" gradientUnits="userSpaceOnUse">
                                                            <stop stopColor="#A855F7" /><stop offset="1" stopColor="#EC4899" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">Download VTT</p>
                                                <p className="text-[11px] text-muted-foreground">Web-ready — HTML5 players</p>
                                            </div>
                                            {downloading === "vtt" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                        </motion.button>

                                        <div className="mx-4 my-1 border-t border-border/50" />

                                        {/* Burned MP4 */}
                                        <motion.button
                                            onClick={() => handleDownload("mp4")}
                                            disabled={downloading !== null}
                                            whileTap={{ scale: 0.97, backgroundColor: "rgba(128,128,128,0.1)" }}
                                            transition={{ duration: 0.1 }}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <rect x="2" y="4" width="20" height="16" rx="3" stroke="url(#mp4-grad)" strokeWidth="2" />
                                                    <path d="M10 9l5 3-5 3V9z" fill="url(#mp4-grad)" />
                                                    <rect x="5" y="16" width="14" height="2" rx="1" fill="url(#mp4-grad)" opacity="0.4" />
                                                    <defs>
                                                        <linearGradient id="mp4-grad" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                                                            <stop stopColor="#FF3B30" /><stop offset="0.5" stopColor="#34C759" /><stop offset="1" stopColor="#00BCD4" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">Export Burned-in MP4</p>
                                                {burnProgress && downloading === "mp4" ? (
                                                    <div className="mt-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                                                {burnProgress.stage === "preparing" && (
                                                                    <><Loader2 className="w-3 h-3 animate-spin" />Preparing...</>
                                                                )}
                                                                {burnProgress.stage === "encoding" && (
                                                                    <>{burnProgress.progress < 1 && <Loader2 className="w-3 h-3 animate-spin" />}Encoding video... {Math.round(burnProgress.progress)}%</>
                                                                )}
                                                                {burnProgress.stage === "finalizing" && (
                                                                    <><Loader2 className="w-3 h-3 animate-spin" />Finalizing...</>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                                            {burnProgress.stage === "preparing" ? (
                                                                <div className="h-full w-1/3 bg-primary/50 rounded-full animate-pulse" />
                                                            ) : (
                                                                <motion.div
                                                                    className="h-full bg-primary rounded-full"
                                                                    initial={{ width: "0%" }}
                                                                    animate={{ width: `${burnProgress.progress}%` }}
                                                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-muted-foreground">Video with baked subtitles — for social media</p>
                                                )}
                                            </div>
                                            {downloading === "mp4" && !burnProgress && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                        </motion.button>

                                        {/* Upscale option — only show if video is below 1080p */}
                                        {videoHeight > 0 && videoHeight < 1080 && (
                                            <>
                                                <div className="mx-4 my-1 border-t border-border/50" />
                                                <div className="px-4 py-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-semibold text-foreground">Enhance Resolution</span>
                                                        <span className="text-[10px] text-muted-foreground ml-auto">{videoHeight}p current</span>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        {[
                                                            { label: "Original", value: null },
                                                            ...(videoHeight < 720 ? [{ label: "720p", value: 720 }] : []),
                                                            ...(videoHeight < 1080 ? [{ label: "1080p", value: 1080 }] : []),
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.label}
                                                                onClick={() => setUpscaleTarget(opt.value)}
                                                                className={cn(
                                                                    "flex-1 text-[11px] font-medium py-1.5 rounded-md border transition-all",
                                                                    upscaleTarget === opt.value
                                                                        ? "border-primary bg-primary/10 text-primary"
                                                                        : "border-border text-muted-foreground hover:border-primary/40"
                                                                )}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
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
                                        : nearestId === sub.id
                                            ? "border-dashed border-primary/40 bg-primary/[0.02]"
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
                                        activeId === sub.id ? "text-foreground" : nearestId === sub.id ? "text-foreground/60" : "text-muted-foreground group-hover:text-foreground/80"
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

            {/* Toast notifications */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 16, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className={cn(
                                "pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-lg backdrop-blur-sm text-sm font-medium",
                                toast.type === 'success'
                                    ? "bg-card/90 border-green-500/20 text-green-500"
                                    : "bg-card/90 border-destructive/20 text-destructive"
                            )}
                        >
                            {toast.type === 'success'
                                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                : <AlertTriangle className="w-4 h-4 shrink-0" />
                            }
                            <span className="truncate max-w-xs">{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
