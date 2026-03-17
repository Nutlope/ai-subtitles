"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, Download, Search, ListTodo, ChevronDown } from "lucide-react";
import Image from "next/image";

/* ── Demo data mimicking the real editor ── */
const DEMO_SUBS = [
    { id: 1, start: "00:00:01", end: "00:00:03", text: "Welcome to SubStudio", confidence: 0.97 },
    { id: 2, start: "00:00:03", end: "00:00:06", text: "The fastest way to caption", confidence: 0.94 },
    { id: 3, start: "00:00:06", end: "00:00:09", text: "your videos with AI", confidence: 0.72 },
    { id: 4, start: "00:00:09", end: "00:00:12", text: "Perfect subtitles, zero effort", confidence: 0.99 },
    { id: 5, start: "00:00:12", end: "00:00:15", text: "Export in any format you need", confidence: 0.91 },
    { id: 6, start: "00:00:15", end: "00:00:18", text: "Powered by Whisper Large v3", confidence: 0.88 },
];

const STYLES = [
    { id: "classic", name: "Classic" },
    { id: "tiktok", name: "TikTok" },
    { id: "box", name: "Modern Box" },
    { id: "outline", name: "Outline" },
] as const;

// Timing — continuous loop, no fade out
const PHASE_BOOT = 600;
const PHASE_CARDS_STAGGER = 120;
const PHASE_STYLE_DWELL = 2800;
const PHASE_PAUSE_BETWEEN = 400;

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
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const rafRef = useRef<number | null>(null);
    const cycleRef = useRef(0);

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

            // On first cycle, stagger cards in. On subsequent cycles, cards are already visible.
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

            // Phase 2: Cycle through styles with subtitle display
            const styleOrder = isFirst
                ? [0, 1, 2, 3]
                : [cycle % STYLES.length, (cycle + 1) % STYLES.length, (cycle + 2) % STYLES.length, (cycle + 3) % STYLES.length];

            styleOrder.forEach((si, loopIdx) => {
                const subIndex = loopIdx % DEMO_SUBS.length;
                const sub = DEMO_SUBS[subIndex];

                // Activate style + card
                add(() => {
                    setActiveStyle(si);
                    setActiveCard(subIndex);
                    setTypingCard(subIndex);
                    setCursorBlink(true);
                }, t);

                // Type out the subtitle text character by character
                const text = sub.text;
                const charDelay = Math.min(35, 800 / text.length);
                for (let ci = 0; ci <= text.length; ci++) {
                    add(() => {
                        setSubtitleText(text.slice(0, ci));
                    }, t + 80 + ci * charDelay);
                }
                const typeTime = 80 + text.length * charDelay;

                add(() => {
                    setCursorBlink(false);
                    setTypingCard(null);
                }, t + typeTime);

                // Animate progress bar smoothly during this dwell
                add(() => {
                    const t0 = performance.now();
                    const tick = (now: number) => {
                        const elapsed = now - t0;
                        const p = Math.min(elapsed / PHASE_STYLE_DWELL, 1);
                        const segStart = loopIdx / styleOrder.length;
                        const segEnd = (loopIdx + 1) / styleOrder.length;
                        setProgress(segStart + p * (segEnd - segStart));
                        if (p < 1) rafRef.current = requestAnimationFrame(tick);
                    };
                    rafRef.current = requestAnimationFrame(tick);
                }, t);

                t += PHASE_STYLE_DWELL + PHASE_PAUSE_BETWEEN;
            });

            // Seamless restart — no fade out
            add(() => {
                setProgress(0);
                runCycle();
            }, t);
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
            case "tiktok":
                return (
                    <div className="text-center">
                        <span className="text-white font-extrabold text-sm sm:text-base uppercase leading-tight" style={{
                            textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
                            letterSpacing: "0.04em",
                        }}>
                            {subtitleText}{cursor}
                        </span>
                    </div>
                );
            case "box":
                return (
                    <div className="bg-white px-4 py-2 rounded-lg text-center shadow-lg">
                        <span className="text-black font-semibold text-xs sm:text-sm leading-snug">
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
            className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-[0_8px_60px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.03]"
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
            <div className="flex" style={{ minHeight: 380 }}>
                {/* Left: Video player area */}
                <div className="flex-[3] flex flex-col border-r border-border/30">
                    {/* Video viewport */}
                    <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
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
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 z-20">
                            <AnimatePresence mode="wait">
                                {subtitleText && isPlaying && (
                                    <motion.div
                                        key={`${currentStyle.id}-${activeCard}`}
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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

                    {/* Style selector bar */}
                    <div className="px-3 sm:px-4 py-2.5 bg-card/60 border-t border-border/20">
                        <div className="flex gap-1.5 sm:gap-2">
                            {STYLES.map((style, i) => (
                                <motion.div
                                    key={style.id}
                                    onHoverStart={() => setHoveredStyle(i)}
                                    onHoverEnd={() => setHoveredStyle(null)}
                                    className={cn(
                                        "px-2.5 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium border cursor-default relative overflow-hidden",
                                        "transition-colors duration-300",
                                        i === activeStyle
                                            ? "border-primary/30 bg-primary/5 text-foreground"
                                            : hoveredStyle === i
                                                ? "border-border/60 text-muted-foreground/80 bg-muted/20"
                                                : "border-transparent text-muted-foreground/40"
                                    )}
                                >
                                    {/* Active indicator line */}
                                    {i === activeStyle && (
                                        <motion.div
                                            layoutId="activeStyleIndicator"
                                            className="absolute bottom-0 left-1.5 right-1.5 h-[1.5px] bg-primary/50 rounded-full"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                    {style.name}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Subtitle panel */}
                <div className="flex-[2] flex flex-col bg-background/40 min-w-0">
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
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-foreground text-background text-[9px] sm:text-[10px] font-semibold">
                                    <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    Export
                                    <ChevronDown className="w-2 h-2 sm:w-2.5 sm:h-2.5 opacity-60" />
                                </div>
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
                    <div className="flex-1 overflow-hidden p-2 sm:p-3 space-y-1.5 sm:space-y-2">
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
