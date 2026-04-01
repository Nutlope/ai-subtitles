"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, Download, Search, ListTodo, ChevronDown, Check, FileText, FileVideo } from "lucide-react";
import Image from "next/image";

/* ── Demo data mimicking the real editor ── */
const DEMO_SUBS = [
    { id: 1, start: "00:00:01", end: "00:00:03", text: "Welcome to SubStudio", confidence: 0.97 },
    { id: 2, start: "00:00:03", end: "00:00:06", text: "The fastest way to caption", confidence: 0.94 },
    { id: 3, start: "00:00:06", end: "00:00:09", text: "your videos with AI", confidence: 0.72 },
    { id: 4, start: "00:00:09", end: "00:00:12", text: "Perfect subtitles, zero effort", confidence: 0.99 },
    { id: 5, start: "00:00:12", end: "00:00:15", text: "Export in any format you need", confidence: 0.91 },
    { id: 6, start: "00:00:15", end: "00:00:18", text: "Powered by Together AI", confidence: 0.88 },
];

const STYLES = [
    { id: "classic", name: "Classic" },
    { id: "tiktok", name: "TikTok" },
    { id: "box", name: "Modern Box" },
    { id: "cinematic", name: "Cinematic" },
    { id: "outline", name: "Outline" },
    { id: "bold-center", name: "Bold Center" },
] as const;

const EXPORT_FORMATS = [
    { ext: ".SRT", color: "text-blue-400", bg: "bg-blue-500/10", label: "SubRip Text" },
    { ext: ".VTT", color: "text-purple-400", bg: "bg-purple-500/10", label: "WebVTT" },
    { ext: ".MP4", color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Burned-in" },
];

// Timing
const PHASE_BOOT = 600;
const PHASE_CARDS_STAGGER = 120;
const PHASE_STYLE_DWELL = 2400;
const PHASE_PAUSE_BETWEEN = 300;

export default function SubtitleSimulator() {
    const [activeCard, setActiveCard] = useState(-1);
    const [cardsVisible, setCardsVisible] = useState(0);
    const [activeStyle, setActiveStyle] = useState(0);
    const [subtitleText, setSubtitleText] = useState("");
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hoveredStyle, setHoveredStyle] = useState<number | null>(null);
    const [cursorBlink, setCursorBlink] = useState(false);
    const [typingCard, setTypingCard] = useState<number | null>(null);
    // Export animation state
    const [showExport, setShowExport] = useState(false);
    const [exportChecks, setExportChecks] = useState<number[]>([]);
    const exportClickedRef = useRef(false);

    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const rafRef = useRef<number | null>(null);
    const cycleRef = useRef(0);

    // Manual export button click handler
    const handleExportClick = () => {
        if (showExport) {
            setShowExport(false);
            setExportChecks([]);
            return;
        }
        exportClickedRef.current = true;
        setShowExport(true);
        setExportChecks([]);
        // Stagger checkmarks
        EXPORT_FORMATS.forEach((_, i) => {
            const id = setTimeout(() => {
                setExportChecks(prev => [...prev, i]);
            }, 400 + i * 500);
            timeoutsRef.current.push(id);
        });
        // Auto-dismiss after 3s
        const dismissId = setTimeout(() => {
            setShowExport(false);
            setExportChecks([]);
            exportClickedRef.current = false;
        }, 3200);
        timeoutsRef.current.push(dismissId);
    };

    useEffect(() => {
        const clearAll = () => {
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        const add = (fn: () => void, ms: number) => {
            const id = setTimeout(fn, ms);
            timeoutsRef.current.push(id);
        };

        function runCycle() {
            clearAll();
            const cycle = cycleRef.current++;
            const isFirst = cycle === 0;

            if (isFirst) {
                setActiveCard(-1);
                setCardsVisible(0);
                setActiveStyle(0);
                setSubtitleText("");
                setProgress(0);
                setIsPlaying(false);
                setCursorBlink(false);
                setTypingCard(null);
                setShowExport(false);
                setExportChecks([]);
            } else {
                // On subsequent cycles, ensure cards and playback are always active
                setCardsVisible(DEMO_SUBS.length);
                setIsPlaying(true);
                setShowExport(false);
                setExportChecks([]);
                setProgress(0);
            }

            let t = isFirst ? PHASE_BOOT : 200;

            // Phase 1: Cards appear one by one (first cycle only)
            if (isFirst) {
                DEMO_SUBS.forEach((_, i) => {
                    add(() => setCardsVisible(i + 1), t);
                    t += PHASE_CARDS_STAGGER;
                });
                t += 400;

                // "Press play" moment
                add(() => setIsPlaying(true), t);
                t += 300;
            }

            // Phase 2: Cycle through all 6 styles with subtitle display
            const totalStyles = STYLES.length;
            const stylesPerCycle = totalStyles;
            const styleOrder = isFirst
                ? Array.from({ length: stylesPerCycle }, (_, i) => i)
                : Array.from({ length: stylesPerCycle }, (_, i) => (cycle * 2 + i) % totalStyles);

            styleOrder.forEach((si, loopIdx) => {
                const subIndex = loopIdx % DEMO_SUBS.length;
                const sub = DEMO_SUBS[subIndex];

                // Activate style + card + immediately set full text (no gap)
                add(() => {
                    setActiveStyle(si);
                    setActiveCard(subIndex);
                    setTypingCard(subIndex);
                    setCursorBlink(true);
                    // Set subtitle text immediately so there's never a blank moment
                    setSubtitleText(sub.text.charAt(0));
                }, t);

                // Type out the subtitle text character by character
                const text = sub.text;
                const charDelay = Math.min(30, 600 / text.length);
                for (let ci = 1; ci <= text.length; ci++) {
                    add(() => {
                        setSubtitleText(text.slice(0, ci));
                    }, t + 40 + ci * charDelay);
                }
                const typeTime = 40 + text.length * charDelay;

                add(() => {
                    setCursorBlink(false);
                    setTypingCard(null);
                }, t + typeTime);

                // Animate progress bar smoothly during this dwell
                add(() => {
                    const t0 = performance.now();
                    const totalPhases = stylesPerCycle + 1; // +1 for export phase
                    const tick = (now: number) => {
                        const elapsed = now - t0;
                        const p = Math.min(elapsed / PHASE_STYLE_DWELL, 1);
                        const segStart = loopIdx / totalPhases;
                        const segEnd = (loopIdx + 1) / totalPhases;
                        setProgress(segStart + p * (segEnd - segStart));
                        if (p < 1) rafRef.current = requestAnimationFrame(tick);
                    };
                    rafRef.current = requestAnimationFrame(tick);
                }, t);

                t += PHASE_STYLE_DWELL + PHASE_PAUSE_BETWEEN;
            });

            // Phase 3: Export animation
            add(() => {
                setShowExport(true);
                setExportChecks([]);
            }, t);

            // Progress bar for export phase
            add(() => {
                const t0 = performance.now();
                const totalPhases = stylesPerCycle + 1;
                const tick = (now: number) => {
                    const elapsed = now - t0;
                    const exportDwell = 2800;
                    const p = Math.min(elapsed / exportDwell, 1);
                    const segStart = stylesPerCycle / totalPhases;
                    const segEnd = 1;
                    setProgress(segStart + p * (segEnd - segStart));
                    if (p < 1) rafRef.current = requestAnimationFrame(tick);
                };
                rafRef.current = requestAnimationFrame(tick);
            }, t);

            // Stagger checkmarks
            EXPORT_FORMATS.forEach((_, i) => {
                add(() => {
                    setExportChecks(prev => [...prev, i]);
                }, t + 400 + i * 500);
            });

            t += 2800;

            // Hide export, reset, restart
            add(() => {
                setShowExport(false);
                setExportChecks([]);
                setProgress(0);
                runCycle();
            }, t + 200);
        }

        runCycle();
        return clearAll;
    }, []);

    const currentStyle = STYLES[activeStyle];

    // Render subtitle with the current style
    const renderSubtitle = () => {
        if (!subtitleText) return null;

        const cursor = cursorBlink ? (
            <span className="inline-block w-[1px] h-[0.9em] bg-white/70 ml-[1px] align-middle" style={{ animation: "blink 0.8s step-end infinite" }} />
        ) : null;

        switch (currentStyle.id) {
            case "classic":
                return (
                    <div className="bg-black/80 px-4 py-2 rounded text-center backdrop-blur-sm">
                        <span className="text-white text-xs sm:text-sm font-normal leading-snug" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                            {subtitleText}{cursor}
                        </span>
                    </div>
                );
            case "tiktok": {
                const fullWords = subtitleText.trimEnd().split(/\s+/).filter(Boolean);
                const highlightIdx = fullWords.length - 1;
                return (
                    <div className="text-center flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">
                        {fullWords.map((word, i) => (
                            <span
                                key={i}
                                className={`font-extrabold text-sm sm:text-base uppercase leading-tight ${i === highlightIdx ? "text-black bg-[#FACC15] px-1 py-0.5 rounded-sm" : "text-white"}`}
                                style={{
                                    textShadow: i !== highlightIdx ? "0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)" : "none",
                                    letterSpacing: "0.04em",
                                }}
                            >
                                {word}
                            </span>
                        ))}
                        {cursor}
                    </div>
                );
            }
            case "box":
                return (
                    <div className="bg-white px-4 py-2 text-center shadow-lg">
                        <span className="text-black font-semibold text-xs sm:text-sm leading-snug">
                            {subtitleText}{cursor}
                        </span>
                    </div>
                );
            case "cinematic":
                return (
                    <div className="text-center">
                        <span className="text-white/90 font-light text-xs sm:text-sm tracking-widest italic leading-relaxed" style={{
                            textShadow: "0 2px 12px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)",
                            letterSpacing: "0.1em",
                        }}>
                            {subtitleText}{cursor}
                        </span>
                    </div>
                );
            case "outline":
                return (
                    <div className="text-center">
                        <span className="text-white font-bold text-xs sm:text-sm leading-snug" style={{
                            WebkitTextStroke: "1.5px black",
                            paintOrder: "stroke fill",
                            textShadow: "0 2px 6px rgba(0,0,0,0.5)",
                        }}>
                            {subtitleText}{cursor}
                        </span>
                    </div>
                );
            case "bold-center":
                return (
                    <div className="text-center">
                        <span className="text-white font-black text-sm sm:text-lg uppercase leading-none tracking-tight" style={{
                            WebkitTextStroke: "1.5px rgba(0,0,0,0.6)",
                            paintOrder: "stroke fill",
                            textShadow: "0 0 20px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.8)",
                        }}>
                            {subtitleText}{cursor}
                        </span>
                    </div>
                );
            default:
                return null;
        }
    };

    const needsReviewCount = DEMO_SUBS.filter(s => s.confidence < 0.8).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-[0_8px_60px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.03] relative"
        >
            {/* ── Nav bar (mirrors real app) ── */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/40 bg-card/90 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center relative">
                        <Image
                            src="/Logo-subtitle.png"
                            alt="SubStudio"
                            width={24}
                            height={24}
                            className="object-contain"
                        />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">SubStudio</span>
                    <span className="text-border/40 mx-0.5 hidden sm:inline">|</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground/40 font-mono hidden sm:inline">demo.mp4</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Step indicator pills */}
                    <div className="flex items-center gap-1">
                        {["Import", "Process", "Edit"].map((label, i) => (
                            <div
                                key={label}
                                className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold transition-all duration-500",
                                    i === 2
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground/30"
                                )}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Editor layout ── */}
            <div className="flex flex-col sm:flex-row sm:h-[480px]">
                {/* Left: Video player area */}
                <div className="sm:flex-[3] flex flex-col border-b sm:border-b-0 sm:border-r border-border/30">
                    {/* Video viewport */}
                    <div className="aspect-video sm:aspect-auto sm:flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                        {/* Cinematic gradient background */}
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800/40 to-black" />
                            {/* Subtle animated grain */}
                            <div
                                className="absolute inset-0 opacity-[0.03]"
                                style={{
                                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E\")",
                                }}
                            />
                            {/* Faux video scene — subtle abstract shapes to make area look like a video */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3/4 h-1/2 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.04]" />
                            </div>
                            {/* Subtle waveform / audio visualizer lines */}
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-[3px] opacity-[0.12]">
                                {[12, 20, 8, 24, 14, 18, 10, 22, 16, 6, 20, 12, 18, 8, 14, 22, 10, 16, 24, 12].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-[2px] bg-white/60 rounded-full"
                                        animate={isPlaying ? {
                                            height: [h, h * 0.4, h * 1.2, h * 0.6, h],
                                        } : { height: h * 0.3 }}
                                        transition={isPlaying ? {
                                            duration: 0.8 + (i % 3) * 0.2,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                            delay: i * 0.05,
                                        } : { duration: 0.5 }}
                                        style={{ height: isPlaying ? h : h * 0.3 }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Play/Pause button */}
                        <AnimatePresence mode="wait">
                            {!isPlaying ? (
                                <motion.div
                                    key="play"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    className="relative z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl"
                                >
                                    <Play className="w-5 h-5 text-white/70 ml-0.5" fill="currentColor" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="playing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="relative z-10"
                                />
                            )}
                        </AnimatePresence>

                        {/* Subtitle overlay */}
                        <div className="absolute bottom-3 sm:bottom-6 left-0 right-0 flex justify-center px-4 sm:px-6 z-20">
                            <AnimatePresence mode="wait">
                                {subtitleText && isPlaying && (
                                    <motion.div
                                        key={`${currentStyle.id}-${activeCard}`}
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        {renderSubtitle()}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>



                        {/* Video controls bar */}
                        <div className="absolute bottom-0 left-0 right-0 z-30">
                            {/* Progress bar */}
                            <div className="h-[3px] bg-white/[0.06] relative group cursor-pointer">
                                <motion.div
                                    className="h-full bg-white/60"
                                    style={{ width: `${progress * 100}%` }}
                                />
                                {/* Playhead dot */}
                                <motion.div
                                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ left: `${progress * 100}%`, marginLeft: -5 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Style selector bar — pill highlight, no underline */}
                    <div className="px-2 sm:px-4 py-2 sm:py-2.5 bg-card/60 border-t border-border/20">
                        <div className="flex gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
                            {STYLES.map((style, i) => (
                                <motion.div
                                    key={style.id}
                                    onHoverStart={() => setHoveredStyle(i)}
                                    onHoverEnd={() => setHoveredStyle(null)}
                                    className="relative px-2.5 sm:px-3 py-1.5 rounded-md text-[9px] sm:text-[10px] font-medium cursor-default"
                                >
                                    {/* Animated background pill */}
                                    {i === activeStyle && (
                                        <motion.div
                                            layoutId="activeStylePill"
                                            className="absolute inset-0 bg-foreground rounded-md"
                                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                        />
                                    )}
                                    <span className={cn(
                                        "relative z-10 transition-colors duration-200",
                                        i === activeStyle
                                            ? "text-background font-semibold"
                                            : hoveredStyle === i
                                                ? "text-muted-foreground/80"
                                                : "text-muted-foreground/40"
                                    )}>
                                        {style.name}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Subtitle panel — hidden on mobile */}
                <div className="hidden sm:flex sm:flex-[2] flex-col bg-background/40 min-w-0 overflow-hidden">
                    {/* Editor toolbar */}
                    <div className="border-b border-border/30 bg-card/40">
                        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-medium flex items-center gap-1.5",
                                    "bg-muted/50 text-foreground/80"
                                )}>
                                    <ListTodo className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    Review
                                    {needsReviewCount > 0 && (
                                        <span className="bg-orange-500/20 text-orange-400 text-[8px] px-1 py-px rounded-full min-w-[14px] text-center font-bold">
                                            {needsReviewCount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[8px] sm:text-[9px] text-muted-foreground/40 font-mono tabular-nums hidden sm:inline">
                                    {DEMO_SUBS.length} subs · 24 words
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 relative">
                                <div
                                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-foreground text-background text-[9px] sm:text-[10px] font-semibold cursor-pointer hover:bg-foreground/90 transition-colors"
                                    onClick={handleExportClick}
                                >
                                    <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    Export
                                    <ChevronDown className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 opacity-60 transition-transform duration-200", showExport && "rotate-180")} />
                                </div>

                                {/* Export dropdown — anchored to Export button */}
                                <AnimatePresence>
                                    {showExport && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                            className="absolute right-0 top-full mt-1.5 z-50 w-56"
                                        >
                                            <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl overflow-hidden">
                                                {/* Header */}
                                                <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-md bg-foreground/10 flex items-center justify-center">
                                                        <Download className="w-3 h-3 text-foreground/70" />
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-foreground">Export Subtitles</span>
                                                </div>

                                                {/* Format list */}
                                                <div className="p-1.5 space-y-0.5">
                                                    {EXPORT_FORMATS.map((fmt, i) => (
                                                        <motion.div
                                                            key={fmt.ext}
                                                            initial={{ opacity: 0, x: -8 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.1, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                                                        >
                                                            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", fmt.bg)}>
                                                                {fmt.ext === ".MP4" ? (
                                                                    <FileVideo className={cn("w-3 h-3", fmt.color)} />
                                                                ) : (
                                                                    <FileText className={cn("w-3 h-3", fmt.color)} />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-semibold text-foreground">{fmt.ext}</p>
                                                                <p className="text-[8px] text-muted-foreground/50">{fmt.label}</p>
                                                            </div>
                                                            {/* Checkmark */}
                                                            <AnimatePresence>
                                                                {exportChecks.includes(i) && (
                                                                    <motion.div
                                                                        initial={{ scale: 0, rotate: -90 }}
                                                                        animate={{ scale: 1, rotate: 0 }}
                                                                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                                                        className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center"
                                                                    >
                                                                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Search bar */}
                        <div className="px-3 sm:px-4 pb-2.5">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30" />
                                <div className="w-full pl-7 pr-3 py-1.5 text-[10px] bg-muted/20 border border-border/30 rounded-lg text-muted-foreground/30 select-none">
                                    Search subtitles...
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subtitle cards */}
                    <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                        {DEMO_SUBS.map((sub, i) => (
                            <AnimatePresence key={sub.id}>
                                {i < cardsVisible && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                        }}
                                        transition={{
                                            duration: 0.35,
                                            ease: [0.22, 1, 0.36, 1],
                                        }}
                                        className={cn(
                                            "px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border transition-all duration-400",
                                            i === activeCard
                                                ? "border-primary/30 bg-primary/[0.04] shadow-[0_0_20px_-4px_hsl(var(--primary)/0.08)]"
                                                : "border-border/30 bg-card/20 hover:border-border/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[7px] sm:text-[8px] font-mono px-1 py-px rounded bg-muted/40 text-muted-foreground/40 tabular-nums">
                                                    {sub.id}
                                                </span>
                                                <span className="text-[7px] sm:text-[8px] text-muted-foreground/30 font-mono tabular-nums">
                                                    {sub.start.slice(3)} → {sub.end.slice(3)}
                                                </span>
                                            </div>
                                            {sub.confidence < 0.8 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="flex items-center gap-1 text-[7px] sm:text-[8px] uppercase font-bold text-orange-400/80 bg-orange-500/10 border border-orange-500/15 px-1.5 py-px rounded-full"
                                                >
                                                    <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
                                                    Review
                                                </motion.span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <p className={cn(
                                                "text-[9px] sm:text-[10px] leading-relaxed transition-all duration-400",
                                                i === activeCard ? "text-foreground" : "text-muted-foreground/50"
                                            )}>
                                                {i === typingCard && i === activeCard ? (
                                                    <>
                                                        {subtitleText}
                                                        {cursorBlink && (
                                                            <span className="inline-block w-[1px] h-[0.85em] bg-primary/60 ml-[1px] align-middle" style={{ animation: "blink 0.8s step-end infinite" }} />
                                                        )}
                                                    </>
                                                ) : sub.text}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
