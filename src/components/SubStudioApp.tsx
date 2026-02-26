"use client";

import { useState } from "react";
import ImportView from "./ImportView";
import SettingsView from "./SettingsView";
import ProcessingView from "./ProcessingView";
import EditorView from "./EditorView";
import ExportView from "./ExportView";
import Logo from "./Logo";
import ApiKeyModal from "./ApiKeyModal";
import { Github, KeyRound, History, Check, CircleDot, Circle } from "lucide-react";

export type AppStep = "import" | "settings" | "processing" | "editor" | "export";

export default function SubStudioApp() {
    const [step, setStep] = useState<AppStep>("import");
    const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);

    // Shared state
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState<string>("");
    const [jobId, setJobId] = useState<string>("");
    const [srtContent, setSrtContent] = useState<string>("");
    const [words, setWords] = useState<unknown[]>([]);
    const [stylePreset, setStylePreset] = useState<string>("tiktok");

    const resetApp = () => {
        setVideoFile(null);
        setYoutubeUrl("");
        setJobId("");
        setSrtContent("");
        setWords([]);
        setStylePreset("tiktok");
        setStep("import");
    };

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden font-sans">
            <header className="h-16 border-b flex items-center px-6 shrink-0 justify-between bg-card text-card-foreground">
                <button onClick={resetApp} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Logo />
                    </div>
                    <h1 className="font-semibold text-lg tracking-tight">SubStudio</h1>
                </button>

                {/* Step Indicator - Hidden on 'import' view, icon-only on other views */}
                {step !== "import" && (
                    <div className="hidden md:flex items-center space-x-3 text-muted-foreground font-medium bg-muted/30 px-4 py-2 rounded-full border border-border/50 shadow-sm animate-in fade-in duration-300">
                        <StepItem current={step} target="settings" />
                        <StepDivider />
                        <StepItem current={step} target="processing" />
                        <StepDivider />
                        <StepItem current={step} target="editor" />
                        <StepDivider />
                        <StepItem current={step} target="export" />
                    </div>
                )}

                {/* Right actions */}
                <div className="flex items-center gap-2">
                    <button
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="Upload History"
                    >
                        <History className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsApiKeyOpen(true)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="API Key Settings"
                    >
                        <KeyRound className="w-5 h-5" />
                    </button>
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="GitHub Repo"
                    >
                        <Github className="w-5 h-5" />
                    </a>
                </div>
            </header>

            <main className="flex-1 overflow-auto flex relative">
                {step === "import" && (
                    <ImportView onNext={() => setStep("settings")} setVideoFile={setVideoFile} setYoutubeUrl={setYoutubeUrl} />
                )}
                {step === "settings" && (
                    <SettingsView onNext={() => setStep("processing")} onBack={() => setStep("import")} />
                )}
                {step === "processing" && (
                    <ProcessingView
                        onNext={() => setStep("editor")}
                        videoFile={videoFile}
                        youtubeUrl={youtubeUrl}
                        setJobId={setJobId}
                        setSrtContent={setSrtContent}
                        setWords={setWords}
                    />
                )}
                {step === "editor" && (
                    <EditorView
                        onNext={() => setStep("export")}
                        onBack={() => setStep("settings")}
                        jobId={jobId}
                        srtContent={srtContent}
                        setSrtContent={setSrtContent}
                        words={words}
                        stylePreset={stylePreset}
                        setStylePreset={setStylePreset}
                    />
                )}
                {step === "export" && (
                    <ExportView
                        onBack={() => setStep("editor")}
                        jobId={jobId}
                        srtContent={srtContent}
                        stylePreset={stylePreset}
                    />
                )}
            </main>

            <ApiKeyModal isOpen={isApiKeyOpen} onClose={() => setIsApiKeyOpen(false)} />
        </div>
    );
}

function StepItem({ current, target }: { current: AppStep; target: AppStep }) {
    const stepOrder = ["settings", "processing", "editor", "export"];
    const currentIndex = stepOrder.indexOf(current);
    const targetIndex = stepOrder.indexOf(target);

    const isPast = targetIndex < currentIndex;
    const isCurrent = current === target;

    return (
        <div className={`flex items-center justify-center transition-all duration-300 ${isCurrent ? 'text-primary scale-110' : isPast ? 'text-foreground' : 'text-muted-foreground'}`}>
            {isPast ? (
                <Check className="w-4 h-4" />
            ) : isCurrent ? (
                <CircleDot className="w-4 h-4" />
            ) : (
                <Circle className="w-4 h-4" />
            )}
        </div>
    );
}

function StepDivider() {
    return <div className="w-6 h-px bg-border/80" />;
}
