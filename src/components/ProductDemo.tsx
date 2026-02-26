"use client";

import { motion } from "framer-motion";
import { Play, Sparkles, Check, Wand2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function ProductDemo() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((s) => (s + 1) % 4);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const words = [
        { text: "Create", color: "text-primary" },
        { text: "viral", color: "text-yellow-500" },
        { text: "clips", color: "text-green-500" },
        { text: "instantly", color: "text-purple-500" }
    ];

    return (
        <div className="w-full max-w-4xl mx-auto my-16 p-8 relative rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="text-center mb-10 relative z-10">
                <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    How it works
                </h2>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
                {/* Step 1: Input Video */}
                <motion.div
                    className={`relative w-64 h-80 rounded-2xl border-2 \${step === 0 ? 'border-primary shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'border-border'} bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center transition-all duration-500`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="absolute inset-0 bg-muted/20" />
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 z-10">
                        <Play className="w-6 h-6 text-primary ml-1" />
                    </div>
                    <p className="font-medium text-muted-foreground z-10">Raw Video</p>

                    {/* Simulated video timeline */}
                    <div className="absolute bottom-4 left-4 right-4 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary/50"
                            initial={{ width: "0%" }}
                            animate={{ width: step === 0 ? "100%" : "0%" }}
                            transition={{ duration: 3, ease: "linear" }}
                        />
                    </div>
                </motion.div>

                {/* Connecting Line / Processing icon */}
                <div className="flex items-center justify-center -my-4 md:my-0 md:-mx-4 z-20">
                    <motion.div
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 \${step === 1 || step === 2 ? 'bg-primary border-primary text-primary-foreground scale-110' : 'bg-card border-border text-muted-foreground'} transition-all duration-500`}
                    >
                        {step === 0 ? <Play className="w-5 h-5 ml-1" /> :
                            step === 1 ? <Wand2 className="w-5 h-5 animate-pulse" /> :
                                step === 2 ? <Sparkles className="w-5 h-5" /> :
                                    <Check className="w-5 h-5" />}
                    </motion.div>
                </div>

                {/* Step 3: Out Video */}
                <motion.div
                    className={`relative w-64 h-80 rounded-2xl border-2 \${step >= 2 ? 'border-primary shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'border-border'} bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center transition-all duration-500`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-0" />

                    {/* Simulated subject in video */}
                    <div className="absolute inset-0 flex items-center justify-center z-0 opacity-20">
                        <div className="w-32 h-48 rounded-full bg-muted blur-2xl" />
                    </div>

                    <div className="z-10 absolute bottom-12 w-full px-4 text-center">
                        <div className="flex flex-wrap justify-center gap-2 items-center min-h-[4rem]">
                            {step >= 2 && words.map((word, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{
                                        opacity: step >= 2 ? (step === 3 && i > 1 ? 0.4 : 1) : 0,
                                        y: 0,
                                        scale: step === 2 && i === 0 ? 1.2 : 1
                                    }}
                                    transition={{
                                        delay: i * 0.2,
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 10
                                    }}
                                    className={`text-2xl font-black uppercase tracking-wider \${word.color} drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]`}
                                    style={{
                                        WebkitTextStroke: "1px rgba(0,0,0,0.5)",
                                    }}
                                >
                                    {word.text}
                                </motion.span>
                            ))}
                        </div>
                    </div>

                    <p className="font-medium text-white/50 absolute top-4 z-10 text-sm bg-black/30 px-3 py-1 rounded-full backdrop-blur-md">Viral Ready</p>
                </motion.div>
            </div>

            {/* Context Text */}
            <div className="mt-12 text-center text-sm font-medium text-muted-foreground animate-pulse">
                {step === 0 && "1. Upload your video"}
                {step === 1 && "2. AI analyzes & transcribes"}
                {step === 2 && "3. Dynamic subtitles applied"}
                {step === 3 && "4. Ready to export for TikTok/Reels"}
            </div>
        </div>
    );
}
