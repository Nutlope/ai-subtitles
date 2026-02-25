import { useState } from "react";
import { ArrowLeft, Download, FileText, FileVideo, CheckCircle2, Save, Loader2, AlertCircle } from "lucide-react";

interface ExportViewProps {
    onBack: () => void;
    jobId: string;
    srtContent: string;
}

export default function ExportView({ onBack, jobId, srtContent }: ExportViewProps) {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    const handleDownload = async (type: string) => {
        try {
            setDownloading(type);
            setError(null);

            if (type === "srt") {
                downloadStringAsFile(srtContent, `substudio_${jobId}.srt`, "text/plain");
                setDownloading(null);
            }
            else if (type === "vtt") {
                const vttContent = convertSrtToVtt(srtContent);
                downloadStringAsFile(vttContent, `substudio_${jobId}.vtt`, "text/vtt");
                setDownloading(null);
            }
            else if (type === "mp4") {
                // Call burn API
                const res = await fetch("/api/burn", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobId, srtContent })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to render video");
                }

                const data = await res.json();

                // Trigger download
                const a = document.createElement("a");
                a.href = data.outputUrl;
                a.download = `substudio_${jobId}_captioned.mp4`;
                a.click();
                setDownloading(null);
            }
        } catch (err: any) {
            console.error("Export Error:", err);
            setError(err.message || "An unknown error occurred");
            setDownloading(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
            <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">

                <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Project Ready to Export</h2>
                    <p className="text-muted-foreground text-lg">
                        Your subtitles have been generated, aligned, and styled.
                    </p>
                    {error && (
                        <div className="flex items-center justify-center gap-2 text-destructive mt-4">
                            <AlertCircle className="w-5 h-5" />
                            <p className="font-medium text-sm">{error}</p>
                        </div>
                    )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-card border border-border p-6 rounded-xl space-y-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-foreground">SRT Format</h3>
                                <p className="text-xs text-muted-foreground">Universal format for YouTube, Premiere, etc.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownload("srt")}
                            disabled={downloading !== null}
                            className="w-full bg-muted text-foreground hover:bg-muted/80 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
                        >
                            {downloading === "srt" ? "Downloading..." : <><Download className="w-4 h-4" /> Download .srt</>}
                        </button>
                    </div>

                    <div className="bg-card border border-border p-6 rounded-xl space-y-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-foreground">VTT Format</h3>
                                <p className="text-xs text-muted-foreground">Web-ready formats with styling info.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownload("vtt")}
                            disabled={downloading !== null}
                            className="w-full bg-muted text-foreground hover:bg-muted/80 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
                        >
                            {downloading === "vtt" ? "Downloading..." : <><Download className="w-4 h-4" /> Download .vtt</>}
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-6 rounded-xl space-y-4 sm:col-span-2 relative overflow-hidden group hover:border-primary/60 transition-colors">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded bg-primary text-primary-foreground flex items-center justify-center">
                                <FileVideo className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-foreground text-lg">Burned-in Video</h3>
                                <p className="text-sm text-foreground/80">Render MP4 with baked-in subtitles. Perfect for social media.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownload("mp4")}
                            disabled={downloading !== null}
                            className="w-full bg-primary text-primary-foreground hover:opacity-90 px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-opacity relative z-10 shadow-lg disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {downloading === "mp4" ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Rendering Video (This may take a while)...</>
                            ) : (
                                <><Download className="w-4 h-4" /> Export Video (MP4)</>
                            )}
                        </button>
                        <div className="absolute right-0 bottom-0 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity scale-150 translate-x-1/4 translate-y-1/4">
                            <FileVideo className="w-64 h-64 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border">
                    <button
                        onClick={onBack}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Editor
                    </button>
                    <button className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors text-sm">
                        <Save className="w-4 h-4" /> Save Project
                    </button>
                </div>
            </div>
        </div>
    );
}
