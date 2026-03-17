"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, Download } from "lucide-react";

/* ── Demo data mimicking the real editor ── */
const DEMO_SUBS = [
    { id: 1, time: "00:01 - 00:03", text: "Welcome to SubStudio" },
    { id: 2, time: "00:03 - 00:06", text: "The fastest way to caption" },
    { id: 3, time: "00:06 - 00:09", text: "your videos with AI" },
    { id: 4, time: "00:09 - 00:12", text: "Perfect subtitles, zero effort" },
];

const STYLES = [
    { id: "classic", name: "Classic" },
    { id: "tiktok", name: "TikTok" },
    { id: "box", name: "Box" },
    { id: "outline", name: "Outline" },
] as const;

// Cycle: ~10s total per loop
const PHASE_BOOT = 400;
const PHASE_CARDS_STAGGER = 150;
const PHASE_STYLE_DWELL = 2200;
const PHASE_FADE_OUT = 700;

export default function SubtitleSimulator() {
    const [activeCard, setActiveCard] = useState(-1);
    const [cardsVisible, setCardsVisible] = useState(0);
    const [activeStyle, setActiveStyle] = useState(0);
    const [subtitleText, setSubtitleText] = useState("");
    const [progress, setProgress] = useState(0);
    const [cardOpacity, setCardOpacity] = useState(1);
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const rafRef = useRef<number | null>(null);

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

            // Reset state
            setActiveCard(-1);
            setCardsVisible(0);
            setActiveStyle(0);
            setSubtitleText("");
            setProgress(0);
            setCardOpacity(1);

            let t = PHASE_BOOT;

            // Phase 1: Cards appear one by one
            DEMO_SUBS.forEach((_, i) => {
                add(() => setCardsVisible(i + 1), t);
                t += PHASE_CARDS_STAGGER;
            });
            t += 300;

            // Phase 2: Cycle through styles, activating cards + showing subtitle text
            STYLES.forEach((style, si) => {
                const subIndex = si % DEMO_SUBS.length;
                add(() => {
                    setActiveStyle(si);
                    setActiveCard(subIndex);
                    setSubtitleText(DEMO_SUBS[subIndex].text);
                }, t);

                // Animate progress bar during this style's dwell
                const startTime = t;
                add(() => {
                    const t0 = performance.now();
                    const tick = (now: number) => {
                        const elapsed = now - t0;
                        const p = Math.min(elapsed / PHASE_STYLE_DWELL, 1);
                        // Map progress to the segment for this style
                        const segStart = si / STYLES.length;
                        const segEnd = (si + 1) / STYLES.length;
                        setProgress(segStart + p * (segEnd - segStart));
                        if (p < 1) rafRef.current = requestAnimationFrame(tick);
                    };
                    rafRef.current = requestAnimationFrame(tick);
                }, startTime);

                t += PHASE_STYLE_DWELL;
            });

            // Phase 3: Fade out
            add(() => setCardOpacity(0), t);
            t += PHASE_FADE_OUT + 100;

            // Phase 4: Restart
            add(() => runCycle(), t);
        }

        runCycle();
        return clearAll;
    }, []);

    const currentStyle = STYLES[activeStyle];

    // Render subtitle with the current style
    const renderSubtitle = () => {
        if (!subtitleText) return null;

        switch (currentStyle.id) {
            case "classic":
                return (
                    <div className="bg-black/80 px-3 py-1.5 rounded text-center">
                        <span className="text-white text-[11px] font-normal leading-snug" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                            {subtitleText}
                        </span>
                    </div>
                );
            case "tiktok":
                return (
                    <div className="text-center">
                        <span className="text-white font-extrabold text-xs uppercase leading-tight" style={{
                            textShadow: "0 1px 6px rgba(0,0,0,0.8), 0 0 3px rgba(0,0,0,0.6)",
                            letterSpacing: "0.04em",
                        }}>
                            {subtitleText}
                        </span>
                    </div>
                );
            case "box":
                return (
                    <div className="bg-white px-3 py-1.5 rounded-md text-center shadow-sm">
                        <span className="text-black font-semibold text-[11px] leading-snug">
                            {subtitleText}
                        </span>
                    </div>
                );
            case "outline":
                return (
                    <div className="text-center">
                        <span className="text-white font-bold text-[11px] leading-snug" style={{
                            WebkitTextStroke: "1px black",
                            paintOrder: "stroke fill",
                            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                        }}>
                            {subtitleText}
                        </span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xl"
            style={{ opacity: cardOpacity, transition: "opacity 700ms ease-in-out" }}
        >
            {/* ── Nav bar (mirrors real app) ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/80">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="text-[11px] font-medium text-foreground tracking-tight">SubStudio</span>
                    <span className="text-border/60 mx-0.5">|</span>
                    <span className="text-[10px] text-muted-foreground/40 font-mono">demo.mp4</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground text-background text-[9px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-background/60" />
                        Edit
                    </div>
                </div>
            </div>

            {/* ── Editor layout ── */}
            <div className="flex" style={{ height: 260 }}>
                {/* Left: Video player area */}
                <div className="flex-[3] flex flex-col border-r border-border/40">
                    {/* Video viewport */}
                    <div className="flex-1 bg-black/90 relative flex items-center justify-center overflow-hidden">
                        {/* Fake video gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800/50 to-black" />

                        {/* Play button hint */}
                        <AnimatePresence>
                            {!subtitleText && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="relative z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                                >
                                    <Play className="w-3.5 h-3.5 text-white/60 ml-0.5" fill="currentColor" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Subtitle overlay */}
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4 z-20">
                            <AnimatePresence mode="wait">
                                {subtitleText && (
                                    <motion.div
                                        key={`${currentStyle.id}-${subtitleText}`}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
                                    >
                                        {renderSubtitle()}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Progress bar at bottom of video */}
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
                            <div
                                className="h-full bg-primary/70 transition-none"
                                style={{ width: `${progress * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Style selector bar */}
                    <div className="px-3 py-2 bg-card/50 border-t border-border/30">
                        <div className="flex gap-1.5">
                            {STYLES.map((style, i) => (
                                <div
                                    key={style.id}
                                    className={cn(
                                        "px-2 py-1 rounded-md text-[9px] font-medium transition-all duration-300 border",
                                        i === activeStyle
                                            ? "border-primary/40 bg-primary/5 text-foreground"
                                            : "border-transparent text-muted-foreground/50"
                                    )}
                                >
                                    {style.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Subtitle cards */}
                <div className="flex-[2] flex flex-col bg-background/50 min-w-0">
                    {/* Mini toolbar */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/50">
                        <span className="text-[9px] font-medium text-muted-foreground">Subtitles</span>
                        <div className="flex items-center gap-1">
                            <div className="px-1.5 py-0.5 rounded text-[8px] font-bold text-muted-foreground/50 bg-muted/30">
                                {DEMO_SUBS.length}
                            </div>
                            <Download className="w-3 h-3 text-muted-foreground/30" />
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-hidden p-2 space-y-1.5">
                        {DEMO_SUBS.map((sub, i) => (
                            <AnimatePresence key={sub.id}>
                                {i < cardsVisible && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{
                                            duration: 0.3,
                                            ease: [0.22, 1, 0.36, 1] as const,
                                        }}
                                        className={cn(
                                            "px-2.5 py-2 rounded-lg border transition-all duration-300",
                                            i === activeCard
                                                ? "border-primary/40 bg-primary/5"
                                                : "border-border/40 bg-card/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[8px] font-mono px-1 py-px rounded bg-muted/50 text-muted-foreground/50">
                                                {sub.id}
                                            </span>
                                            <span className="text-[8px] text-muted-foreground/40 font-mono">
                                                {sub.time}
                                            </span>
                                        </div>
                                        <p className={cn(
                                            "text-[10px] leading-relaxed transition-colors duration-300",
                                            i === activeCard ? "text-foreground" : "text-muted-foreground/60"
                                        )}>
                                            {sub.text}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
