import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { UploadCloud, Link as LinkIcon, ArrowRight, ArrowUp, GithubIcon } from "lucide-react";
import SubtitleSimulator from "./SubtitleSimulator";
import Image from "next/image";
import { cn } from "@/lib/utils";


interface ImportViewProps {
    onNext: () => void;
    setVideoFile: (file: File | null) => void;
    setYoutubeUrl: (url: string) => void;
    setIsSample: (v: boolean) => void;
}

/* ── Stagger animation helpers ── */
const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
};

const childFadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const headlineStagger = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.1, delayChildren: 0.25 },
    },
};

const headlineChild = {
    hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const cardZoomIn = {
    hidden: { opacity: 0, scale: 0.95, y: 16 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
};

/* ── Stats data ── */
const STATS = [
    {
        value: "1.8s",
        label: "Avg transcription",
        description: "Lightning-fast AI processing",
        gradient: "from-amber-500/20 to-orange-500/10",
        outerGradient: "from-[#F59E0B] to-[#F97316]",
        renderIcon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#stat-bolt)" />
                <defs>
                    <linearGradient id="stat-bolt" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F59E0B" />
                        <stop offset="1" stopColor="#F97316" />
                    </linearGradient>
                </defs>
            </svg>
        ),
    },
    {
        value: "Word-level",
        label: "Timing accuracy",
        description: "Precise per-word timestamps",
        gradient: "from-blue-500/20 to-cyan-500/10",
        outerGradient: "from-[#3B82F6] to-[#06B6D4]",
        renderIcon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="url(#stat-target)" opacity="0.15" />
                <circle cx="12" cy="12" r="7" fill="url(#stat-target)" opacity="0.3" />
                <circle cx="12" cy="12" r="3.5" fill="url(#stat-target)" />
                <defs>
                    <linearGradient id="stat-target" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3B82F6" />
                        <stop offset="1" stopColor="#06B6D4" />
                    </linearGradient>
                </defs>
            </svg>
        ),
    },
    {
        value: "6",
        label: "Style presets",
        description: "From classic to bold center",
        gradient: "from-purple-500/20 to-pink-500/10",
        outerGradient: "from-[#A855F7] to-[#EC4899]",
        renderIcon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.8 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5-4.5-9-10-9z" fill="url(#stat-palette)" />
                <circle cx="7.5" cy="11" r="1.5" fill="white" opacity="0.6" />
                <circle cx="10.5" cy="7.5" r="1.5" fill="white" opacity="0.6" />
                <circle cx="15" cy="7.5" r="1.5" fill="white" opacity="0.6" />
                <defs>
                    <linearGradient id="stat-palette" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#A855F7" />
                        <stop offset="1" stopColor="#EC4899" />
                    </linearGradient>
                </defs>
            </svg>
        ),
    },
];

export default function ImportView({ onNext, setVideoFile, setYoutubeUrl, setIsSample }: ImportViewProps) {
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");
    const heroRef = useRef<HTMLDivElement>(null);

    const scrollToHero = () => {
        heroRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setVideoFile(acceptedFiles[0]);
            setYoutubeUrl(""); // Clear URL if file uploaded
            setIsSample(false);
            onNext();
        }
    }, [setVideoFile, setYoutubeUrl, setIsSample, onNext]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/mp4': ['.mp4'],
            'video/quicktime': ['.mov'],
            'video/webm': ['.webm'],
            'audio/mpeg': ['.mp3'],
            'audio/wav': ['.wav'],
        },
        maxFiles: 1,
        multiple: false
    });

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        // Broad URL validation — accept YouTube, youtu.be, and direct video URLs
        const ytRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)?(youtube\.com|youtu\.be)\/.+$/;
        const videoUrlRegex = /^https?:\/\/.+\.(mp4|webm|mov)(\?.*)?$/i;
        const genericUrl = /^https?:\/\/.+/;

        if (!ytRegex.test(url) && !videoUrlRegex.test(url) && !genericUrl.test(url)) {
            setError("Please enter a valid YouTube or video URL");
            return;
        }

        setError("");
        setYoutubeUrl(url);
        setVideoFile(null); // Clear file if URL provided
        setIsSample(false);
        onNext();
    };

    return (
        <div className="flex-1 w-full pb-0">
            {/* Background effects — floating blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-muted/40 blur-[100px]"
                    style={{ animation: "float 8s ease-in-out infinite" }}
                />
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-muted/20 blur-[100px]"
                    style={{ animation: "float 10s ease-in-out 2s infinite" }}
                />
            </div>

            {/* Hero Section */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="min-h-[90vh] flex flex-col items-center justify-center px-6 pt-12 pb-20 relative z-10"
            >
                {/* Badge */}
                <motion.div
                    variants={childFadeUp}
                    className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-muted/50 border border-border text-sm font-medium text-muted-foreground mb-8"
                >
                    {/* Mini animated equalizer */}
                    <div className="flex items-end gap-[2px] h-[12px]">
                        {[
                            { h: "40%", d: "0s" },
                            { h: "80%", d: "0.18s" },
                            { h: "55%", d: "0.36s" },
                            { h: "100%", d: "0.09s" },
                        ].map(({ h, d }, i) => (
                            <div
                                key={i}
                                className="w-[2px] rounded-full bg-muted-foreground/70 origin-bottom"
                                style={{
                                    height: h,
                                    animation: `waveBar 1.3s ease-in-out ${d} infinite`,
                                }}
                            />
                        ))}
                    </div>
                    <span>Powered by Together AI x Whisper</span>
                </motion.div>

                {/* Hero text — staggered headline entrance */}
                <motion.div
                    variants={headlineStagger}
                    initial="hidden"
                    animate="visible"
                    className="text-center max-w-2xl mb-10"
                >
                    <motion.h1
                        variants={headlineChild}
                        className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-foreground leading-[1.15]"
                    >
                        Perfect{" "}
                        <span className="hero-gradient-text">
                            subtitles
                        </span>
                        ,
                    </motion.h1>
                    <motion.h1
                        variants={headlineChild}
                        className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-foreground leading-[1.15] mt-1"
                    >
                        zero effort.
                    </motion.h1>
                    <motion.p
                        variants={headlineChild}
                        className="text-muted-foreground text-lg mt-5 font-light max-w-lg mx-auto"
                    >
                        Upload your video or paste a YouTube link. Our AI handles the transcription, alignment, and styling instantly.
                    </motion.p>
                </motion.div>

                {/* Upload card */}
                <motion.div
                    ref={heroRef}
                    variants={cardZoomIn}
                    className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-2"
                >
                    <div className="bg-background/50 rounded-xl p-8 border border-border/50">
                        <div className="grid gap-6">
                            {/* Drag & Drop Zone */}
                            <div
                                {...getRootProps()}
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 relative z-20",
                                    isDragActive ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center gap-4">
                                    <div className={cn(
                                        "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                                        isDragActive ? "bg-primary text-primary-foreground scale-110" : "bg-primary/10 text-primary"
                                    )}>
                                        <UploadCloud className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-lg font-medium">
                                            {isDragActive ? "Drop video here" : "Click or drag video to upload"}
                                        </p>
                                        <p className="text-sm text-muted-foreground font-medium">
                                            MP4, MOV, WEBM, MP3 up to 500MB · under 2 hours
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="bg-background px-3 text-muted-foreground">Or</span>
                                </div>
                            </div>

                            {/* YouTube Link Input */}
                            <form onSubmit={handleUrlSubmit} className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1 group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-foreground transition-colors">
                                            <LinkIcon className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Paste YouTube or MP4 link..."
                                            aria-label="Video URL"
                                            className="w-full pl-12 pr-4 py-3.5 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background transition-all duration-300 shadow-sm text-foreground font-medium"
                                            value={url}
                                            onChange={(e) => {
                                                setUrl(e.target.value);
                                                if (error) setError("");
                                            }}
                                        />
                                    </div>
                                    <motion.button
                                        type="submit"
                                        disabled={!url.trim()}
                                        whileTap={{ scale: 0.98 }}
                                        className="bg-foreground text-background px-8 py-3.5 rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:w-auto w-full gap-2"
                                    >
                                        Import <ArrowRight className="w-4 h-4" />
                                    </motion.button>
                                </div>
                                {error ? (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-destructive text-sm font-medium px-1"
                                    >
                                        {error}
                                    </motion.p>
                                ) : (
                                    <p className="text-[11px] text-muted-foreground/50 px-1">
                                        Direct video URLs work best. YouTube links may be blocked by bot detection — if so, download the video and upload it.
                                    </p>
                                )}
                            </form>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="bg-background px-3 text-muted-foreground">Or try a demo</span>
                                </div>
                            </div>

                            {/* Sample video CTA */}
                            <motion.button
                                type="button"
                                onClick={() => {
                                    const sampleUrl = `${window.location.origin}/sample-demo.mp4`;
                                    setYoutubeUrl(sampleUrl);
                                    setVideoFile(null);
                                    setIsSample(true);
                                    onNext();
                                }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 text-left group relative z-20"
                            >
                                {/* Custom play triangle inspired by the SubStudio logo */}
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF3B30] via-[#34C759] to-[#00BCD4] p-[1.5px] shrink-0 group-hover:shadow-lg group-hover:shadow-[#34C759]/20 transition-shadow">
                                    <div className="w-full h-full rounded-[10px] bg-background flex items-center justify-center">
                                        <svg width="14" height="16" viewBox="0 0 14 16" fill="none" className="ml-0.5">
                                            <path d="M13 7.134a1 1 0 0 1 0 1.732l-11.5 6.64A1 1 0 0 1 0 14.639V1.361A1 1 0 0 1 1.5.495L13 7.134Z" fill="url(#sample-play-grad)" />
                                            <defs>
                                                <linearGradient id="sample-play-grad" x1="0" y1="0" x2="14" y2="16" gradientUnits="userSpaceOnUse">
                                                    <stop stopColor="#FF9500" />
                                                    <stop offset="0.5" stopColor="#34C759" />
                                                    <stop offset="1" stopColor="#00BCD4" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">Try with a sample video</p>
                                    <p className="text-xs text-muted-foreground">See how SubStudio works — no upload needed</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>


            {/* Pipeline Demo Section */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative z-10 border-t border-border/50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                    className="flex flex-col items-center"
                >
                    {/* Eyebrow label */}
                    <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground/40 mb-4">
                        watch it work
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-3">
                        A full-featured editor
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base text-center max-w-lg mb-10 sm:mb-14">
                        Edit, style, review, and export — all in one place.
                    </p>

                    {/* Simulator — full width */}
                    <div className="w-full">
                        <SubtitleSimulator />
                    </div>

                    {/* Stats cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 sm:mt-16 w-full max-w-3xl">
                        {STATS.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-40px" }}
                                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 transition-all duration-500 hover:border-border hover:shadow-xl hover:shadow-black/25"
                            >
                                {/* Gradient accent */}
                                <div className={cn(
                                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
                                    stat.gradient
                                )} />

                                <div className="relative z-10">
                                    <div className={cn(
                                        "w-9 h-9 rounded-[10px] p-[2px] mb-3 bg-gradient-to-br shrink-0 group-hover:shadow-lg transition-shadow",
                                        stat.outerGradient
                                    )}>
                                        <div className="w-full h-full rounded-[8px] bg-background flex items-center justify-center overflow-hidden">
                                            {stat.renderIcon()}
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold text-foreground tracking-tight mb-0.5">
                                        {stat.value}
                                    </div>
                                    <div className="text-xs font-medium text-muted-foreground/70 mb-1">
                                        {stat.label}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground/40 leading-relaxed">
                                        {stat.description}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* ── CTA Section ── */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative z-10 border-t border-border/50">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center text-center"
                >
                    <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground/40 mb-4">
                        get started
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                        Ready to caption your next video?
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-md mb-8">
                        Drop a file or paste a link — subtitles in seconds, not hours.
                    </p>
                    <motion.button
                        onClick={scrollToHero}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-2.5 bg-foreground text-background px-7 py-3.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-shadow duration-300"
                    >
                        Get Started — Free
                        <ArrowUp className="w-4 h-4" />
                    </motion.button>
                </motion.div>
            </div>

            {/* ── Footer ── */}
            <footer className="relative z-10 border-t border-border/40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Left — Powered by Together AI */}
                        <a
                            href="https://together.ai"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors group"
                        >
                            <Image
                                src="/together-logo-solo.svg"
                                alt="Together AI"
                                width={16}
                                height={16}
                                className="opacity-50 group-hover:opacity-100 transition-opacity"
                            />
                            <span className="text-xs font-medium">Powered by Together AI</span>
                        </a>

                        {/* Center / Right — Links */}
                        <div className="flex items-center gap-5">
                            <a
                                href="https://github.com/Luffixos/ai-subtitles"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <GithubIcon className="w-3.5 h-3.5" />
                                GitHub
                            </a>
                            <span className="text-[11px] text-muted-foreground/40">
                                © {new Date().getFullYear()} SubStudio
                            </span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
