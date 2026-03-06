import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { UploadCloud, Link as LinkIcon, FileVideo, ArrowRight, Zap, Type, Settings2, Sparkles } from "lucide-react";
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
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
};

const cardZoomIn = {
    hidden: { opacity: 0, scale: 0.95, y: 16 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-sm font-medium text-muted-foreground mb-8"
                >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>The fastest way to caption your videos</span>
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
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors border border-transparent hover:border-border hover:bg-muted/50 px-4 py-2 rounded-full relative z-20"
                    >
                        <FileVideo className="w-4 h-4" />
                        Try with a sample video
                    </motion.button>
                </motion.div>
            </motion.div>


            {/* Features Section */}
            <div className="max-w-6xl mx-auto px-6 py-24 relative z-10 border-t border-border/50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        SubStudio is built for speed and precision, giving you full control over your content.
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.12 } },
                    }}
                    className="grid md:grid-cols-3 gap-8"
                >
                    <FeatureCard
                        icon={<Zap className="w-6 h-6 text-yellow-500" />}
                        title="Blazing Fast Transcription"
                        description="Powered by Groq and Whisper, get highly accurate transcripts in seconds, not minutes."
                    />
                    <FeatureCard
                        icon={<Type className="w-6 h-6 text-primary" />}
                        title="Word-level Animation"
                        description="Engage your audience with dynamic, word-by-word highlighted subtitles built right in."
                    />
                    <FeatureCard
                        icon={<Settings2 className="w-6 h-6 text-emerald-500" />}
                        title="Fully Customizable"
                        description="Adjust fonts, colors, positioning, and animations to match your unique brand style."
                    />
                </motion.div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 24 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                },
            }}
            whileHover={{ y: -4, transition: { duration: 0.25 } }}
            className="bg-card border border-border/50 p-6 rounded-2xl hover:bg-muted/30 hover:shadow-lg hover:shadow-primary/[0.03] transition-all duration-300 cursor-default"
        >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
        </motion.div>
    );
}
