import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { UploadCloud, Link as LinkIcon, FileVideo, ArrowRight, ArrowUp, Zap, Target, Palette, Github } from "lucide-react";
import SubtitleSimulator from "./SubtitleSimulator";
import Image from "next/image";
import { cn } from "@/lib/utils";


interface ImportViewProps {
    onNext: () => void;
    setVideoFile: (file: File | null) => void;
    setYoutubeUrl: (url: string) => void;
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
        icon: Zap,
        value: "1.8s",
        label: "Avg transcription",
        description: "Lightning-fast AI processing",
        gradient: "from-amber-500/20 to-orange-500/10",
        iconColor: "text-amber-400",
    },
    {
        icon: Target,
        value: "Word-level",
        label: "Timing accuracy",
        description: "Precise per-word timestamps",
        gradient: "from-blue-500/20 to-cyan-500/10",
        iconColor: "text-blue-400",
    },
    {
        icon: Palette,
        value: "6",
        label: "Style presets",
        description: "From classic to bold center",
        gradient: "from-purple-500/20 to-pink-500/10",
        iconColor: "text-purple-400",
    },
];

export default function ImportView({ onNext, setVideoFile, setYoutubeUrl }: ImportViewProps) {
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
            onNext();
        }
    }, [setVideoFile, setYoutubeUrl, onNext]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/mp4': ['.mp4'],
            'video/quicktime': ['.mov'],
            'video/webm': ['.webm']
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
                className="min-h-[85vh] flex flex-col items-center justify-center p-6 relative z-10"
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
                    <span>Groq · Whisper · word-level precision</span>
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
                        Perfect subtitles,
                    </motion.h1>
                    <motion.h1
                        variants={headlineChild}
                        className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.15] mt-1"
                    >
                        <span className="hero-gradient-text">
                            zero effort.
                        </span>
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
                                            MP4, MOV, WEBM up to 1GB
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
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-destructive text-sm font-medium px-1"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </form>
                        </div>
                    </div>
                </motion.div>

                {/* Sample video button */}
                <motion.div variants={childFadeUp} className="mt-8">
                    <motion.button
                        type="button"
                        onClick={() => {
                            setYoutubeUrl("https://www.youtube.com/watch?v=kBX5WH9b4M4");
                            setVideoFile(null);
                            onNext();
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors border border-transparent hover:border-border hover:bg-muted/50 px-4 py-2 rounded-full relative z-20"
                    >
                        <FileVideo className="w-4 h-4" />
                        Try with a sample video
                    </motion.button>
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
                                        "w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-white/[0.04] border border-white/[0.06] transition-colors duration-300 group-hover:bg-white/[0.08]"
                                    )}>
                                        <stat.icon className={cn("w-4.5 h-4.5", stat.iconColor)} />
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
                        className="inline-flex items-center gap-2.5 bg-foreground text-background px-7 py-3.5 rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-shadow duration-300"
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
                                <Github className="w-3.5 h-3.5" />
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
