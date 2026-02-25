import { useState } from "react";
import { ArrowLeft, ArrowRight, Settings2, Globe, Type, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
    onNext: () => void;
    onBack: () => void;
}

export default function SettingsView({ onNext, onBack }: SettingsViewProps) {
    const [language, setLanguage] = useState("auto");
    const [bilingual, setBilingual] = useState(false);
    const [preset, setPreset] = useState("youtube");

    const presets = [
        { id: "youtube", name: "YouTube", format: "SRT", desc: "Best for YouTube subtitles" },
        { id: "web", name: "Web Player", format: "VTT", desc: "Best for HTML5 & Web" },
        { id: "shorts", name: "Shorts / Reels", format: "MP4", desc: "Burned-in captions" },
    ];

    const languages = [
        { code: "auto", name: "Auto-detect" },
        { code: "en", name: "English" },
        { code: "es", name: "Spanish" },
        { code: "fr", name: "French" },
        { code: "de", name: "German" },
        { code: "hi", name: "Hindi" },
        { code: "ja", name: "Japanese" },
        { code: "zh", name: "Chinese" },
    ];

    return (
        <div className="flex-1 flex flex-col p-6 max-w-3xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                    onClick={onNext}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                    Continue <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight inline-flex items-center gap-3">
                        <Settings2 className="w-8 h-8 text-primary" />
                        Project Settings
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Configure how you want your subtitles to be generated and formatted.
                    </p>
                </div>

                <div className="grid gap-8 bg-card border border-border rounded-xl p-8 shadow-sm">
                    {/* Spoken Language */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                            Spoken Language
                        </div>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground appearance-none"
                        >
                            {languages.map((l) => (
                                <option key={l.code} value={l.code}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Bilingual Toggle */}
                    <div className="space-y-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <Type className="w-5 h-5 text-muted-foreground" />
                                Bilingual Captions
                            </div>
                            <p className="text-sm text-muted-foreground pl-7">
                                Generate subtitles containing original text + translated text.
                            </p>
                        </div>
                        <button
                            onClick={() => setBilingual(!bilingual)}
                            className={cn(
                                "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none focus:ring-2 focus:ring-primary/50",
                                bilingual ? "bg-primary" : "bg-muted"
                            )}
                        >
                            <span className="sr-only">Use bilingual setting</span>
                            <span
                                className={cn(
                                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                                    bilingual ? "translate-x-7" : "translate-x-0"
                                )}
                            />
                        </button>
                    </div>

                    {/* Output Preset */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                            <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
                            Output Preset
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4">
                            {presets.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setPreset(p.id)}
                                    className={cn(
                                        "text-left p-4 rounded-xl border-2 transition-all duration-200",
                                        preset === p.id
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                                    )}
                                >
                                    <div className="font-semibold text-foreground mb-1 flex items-center justify-between">
                                        {p.name}
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium">{p.format}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {p.desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
