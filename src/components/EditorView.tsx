import { useState, useEffect, useRef } from "react";
import { Play, Pause, ArrowRight, ListTodo, AlertTriangle, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subtitle {
    id: number;
    start: string;
    end: string;
    text: string;
    confidence: number;
}

interface EditorViewProps {
    onNext: () => void;
    onBack: () => void;
    jobId: string;
    srtContent: string;
    setSrtContent: (srt: string) => void;
    words: any[];
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

export default function EditorView({ onNext, onBack, jobId, srtContent, setSrtContent, words, stylePreset, setStylePreset }: EditorViewProps) {
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showReviewQueue, setShowReviewQueue] = useState(false);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);

    const stylePresets = [
        { id: "classic", name: "Classic", desc: "Standard bottom text" },
        { id: "tiktok", name: "TikTok", desc: "Yellow highlights, word-by-word" },
        { id: "box", name: "Modern Box", desc: "Text with solid background" },
        { id: "cinematic", name: "Cinematic", desc: "Subtle drop shadow" }
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
            // Estimate confidence based on Groq words if available (stubbed for UI if not)
            const confidence = Math.random() > 0.9 ? 0.7 : 0.95; // Fake confidence for UI
            return { id, start: times[0], end: times[1], text, confidence };
        });
        setSubtitles(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
    }, [srtContent]);

    // Handle Time Update
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);

        // Find active subtitle
        const active = subtitles.find(s => {
            const startStr = parseTime(s.start);
            const endStr = parseTime(s.end);
            return time >= startStr && time <= endStr;
        });

        if (active && active.id !== activeId) {
            setActiveId(active.id);
            // Optionally auto-scroll list
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

    const calculateCPS = (text: string) => text.length / 3.5; // Stubbed
    const needsReviewCount = subtitles.filter(s => s.confidence < 0.8).length;

    // Save changes to parent state before next
    const handleExport = () => {
        const newSrt = subtitles.map(s => `${s.id}\n${s.start} --> ${s.end}\n${s.text}\n`).join('\n');
        setSrtContent(newSrt);
        onNext();
    };

    const videoUrl = jobId ? `/temp/${jobId}.mp4` : '';

    return (
        <div className="flex-1 flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Panel: Video Player */}
            <div className="flex-[3] flex flex-col border-r bg-card/30 relative">
                <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                    <div className="w-full max-w-4xl aspect-video bg-black rounded-lg shadow-xl overflow-hidden relative flex items-center justify-center group ring-1 ring-border">
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

                        {/* Subtitle Overlay */}
                        <div className="absolute bottom-12 left-0 right-0 flex justify-center z-10 px-10 pointer-events-none">
                            <div className="bg-black/70 backdrop-blur-md px-6 py-3 rounded-lg border border-white/10 text-center shadow-lg">
                                <span className="text-white font-medium text-lg lg:text-3xl tracking-wide drop-shadow-md">
                                    {subtitles.find(s => {
                                        const start = parseTime(s.start);
                                        const end = parseTime(s.end);
                                        return currentTime >= start && currentTime <= end;
                                    })?.text || subtitles.find(s => s.id === activeId)?.text || ""}
                                </span>
                            </div>
                        </div>

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
                    </div>
                </div>

                {/* Style Selection Below Video */}
                <div className="p-6 border-t bg-card/50">
                    <h3 className="font-medium text-foreground text-sm mb-3">Subtitle Style</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {stylePresets.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => setStylePreset(preset.id)}
                                className={cn(
                                    "p-3 text-left rounded-xl border transition-all",
                                    stylePreset === preset.id
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-border hover:border-primary/40 hover:bg-muted/30 focus:outline-none"
                                )}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-xs">{preset.name}</span>
                                    {stylePreset === preset.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                                </div>
                                <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel: Editor */}
            <div className="flex-[2] flex flex-col bg-background min-w-[400px] h-full overflow-hidden">
                {/* Editor Toolbar */}
                <div className="h-16 border-b flex items-center justify-between px-4 shrink-0 bg-card">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2"
                        >
                            &larr; Back
                        </button>
                        <button
                            onClick={() => setShowReviewQueue(!showReviewQueue)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
                                showReviewQueue ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
                            )}
                        >
                            <ListTodo className="w-4 h-4" />
                            Review Queue
                            {needsReviewCount > 0 && (
                                <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full min-w-4 text-center">
                                    {needsReviewCount}
                                </span>
                            )}
                        </button>
                    </div>
                    <button
                        onClick={handleExport}
                        className="text-sm bg-foreground text-background px-4 py-2 rounded-lg font-medium hover:bg-foreground/90 transition-colors flex items-center gap-2"
                    >
                        Export <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Subtitle List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {subtitles.filter(s => showReviewQueue ? s.confidence < 0.8 : true).map((sub) => {
                        const cpsValue = calculateCPS(sub.text);
                        const isLong = sub.text.length > 50;
                        const needsReview = sub.confidence < 0.8;

                        return (
                            <div
                                id={`sub-${sub.id}`}
                                key={sub.id}
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
                                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                                                <AlertTriangle className="w-3 h-3" /> Review
                                            </span>
                                        )}
                                        {isLong && cpsValue > 15 && (
                                            <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded" title="Too many characters per line">
                                                Length Warning
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
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
