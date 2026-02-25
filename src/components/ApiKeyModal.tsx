import { useState, useEffect } from "react";
import { KeyRound, X, CheckCircle2 } from "lucide-react";

export default function ApiKeyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [apiKey, setApiKey] = useState("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem("substudio_together_api_key");
            if (stored) setApiKey(stored);
            setSaved(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem("substudio_together_api_key", apiKey.trim());
            setSaved(true);
            setTimeout(() => {
                onClose();
            }, 1000);
        } else {
            localStorage.removeItem("substudio_together_api_key");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">API Key</h2>
                        <p className="text-sm text-muted-foreground">Enter your Together AI API key for fast transcription.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Together AI API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                setSaved(false);
                            }}
                            placeholder="...9bc369d..."
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                            Your key is stored locally in your browser and never sent anywhere else.
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saved}
                        className="w-full bg-foreground text-background hover:opacity-90 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50"
                    >
                        {saved ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                Saved!
                            </>
                        ) : (
                            "Save Key"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
