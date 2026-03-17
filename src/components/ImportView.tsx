import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { UploadCloud, Link as LinkIcon, FileVideo, ArrowRight } from "lucide-react";
import SubtitleSimulator from "./SubtitleSimulator";
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

const cardZoomIn = {
    hidden: { opacity: 0, scale: 0.95, y: 16 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
};

export default function ImportView({ onNext, setVideoFile, setYoutubeUrl }: ImportViewProps) {
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");

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
        <div className="flex-1 w-full pb-20">
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

                {/* Hero text */}
                <motion.div
                    variants={childFadeUp}
                    className="text-center space-y-3 max-w-2xl mb-10"
                >
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                        Perfect subtitles, <br className="hidden md:block" />
                        <span className="text-primary mt-1 inline-block">
                            zero effort.
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-lg mt-3 font-light">
                        Upload your video or paste a YouTube link. Our AI handles the transcription, alignment, and styling instantly.
                    </p>
                </motion.div>

                {/* Upload card */}
                <motion.div
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

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mt-10 sm:mt-14 text-sm text-muted-foreground">
                        <div>
                            <span className="text-foreground font-semibold">1.8s</span>
                            {" avg transcription"}
                        </div>
                        <span className="text-border/60 hidden md:inline">·</span>
                        <div>
                            <span className="text-foreground font-semibold">Word-level</span>
                            {" timing accuracy"}
                        </div>
                        <span className="text-border/60 hidden md:inline">·</span>
                        <div>
                            <span className="text-foreground font-semibold">6</span>
                            {" style presets"}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
