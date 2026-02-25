"use client";

import { useState } from "react";
import ImportView from "./ImportView";
import SettingsView from "./SettingsView";
import ProcessingView from "./ProcessingView";
import EditorView from "./EditorView";
import ExportView from "./ExportView";
import Logo from "./Logo";
import ApiKeyModal from "./ApiKeyModal";
import { Github, KeyRound, History } from "lucide-react";

export type AppStep = "import" | "settings" | "processing" | "editor" | "export";

export default function SubStudioApp() {
    const [step, setStep] = useState<AppStep>("import");
    const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);

    // Shared state
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState<string>("");
    const [jobId, setJobId] = useState<string>("");
    const [srtContent, setSrtContent] = useState<string>("");
    const [words, setWords] = useState<any[]>([]);

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden font-sans">
            <header className="h-16 border-b flex items-center px-6 shrink-0 justify-between bg-card text-card-foreground">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Logo />
                    </div>
                    <h1 className="font-semibold text-lg tracking-tight">SubStudio</h1>
                </div>

                {/* Step Indicator - More subtle, centered */}
                <div className="hidden md:flex items-center space-x-2 text-xs text-muted-foreground font-medium bg-muted/50 px-4 py-1.5 rounded-full border border-border/50">
                    <StepItem current={step} target="import" label="1. Import" />
                    <StepDivider />
                    <StepItem current={step} target="settings" label="2. Settings" />
                    <StepDivider />
                    <StepItem current={step} target="processing" label="3. Processing" />
                    <StepDivider />
                    <StepItem current={step} target="editor" label="4. Editor" />
                    <StepDivider />
                    <StepItem current={step} target="export" label="5. Export" />
                </div>

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
                    />
                )}
                {step === "export" && (
                    <ExportView
                        onBack={() => setStep("editor")}
                        jobId={jobId}
                        srtContent={srtContent}
                    />
                )}
            </main>

            <ApiKeyModal isOpen={isApiKeyOpen} onClose={() => setIsApiKeyOpen(false)} />
        </div>
    );
}

function StepItem({ current, target, label }: { current: AppStep; target: AppStep; label: string }) {
    const stepOrder = ["import", "settings", "processing", "editor", "export"];
    const currentIndex = stepOrder.indexOf(current);
    const targetIndex = stepOrder.indexOf(target);

    const isPast = targetIndex < currentIndex;
    const isCurrent = current === target;

    return (
        <span className={`transition-colors duration-200 ${isCurrent ? 'text-foreground font-semibold' : isPast ? 'text-primary opacity-80' : 'text-muted-foreground'}`}>
            {label}
        </span>
    );
}

function StepDivider() {
    return <span className="text-border mx-1">/</span>;
}
