import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, X, CheckCircle2, ExternalLink } from "lucide-react";

export default function ApiKeyModal({ isOpen, onClose, variant = "default" }: { isOpen: boolean; onClose: () => void; variant?: "default" | "out-of-credits" }) {
    const [apiKey, setApiKey] = useState("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem("substudio_together_api_key");
            if (stored) setApiKey(stored);
            setSaved(false);
        }
    }, [isOpen]);

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
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.93, y: 10 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="API Key Settings"
                        className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 relative"
                    >
                        <motion.button
                            onClick={onClose}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            aria-label="Close"
                            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>

                        <div className="flex items-center gap-3 mb-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${variant === "out-of-credits" ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"}`}
                            >
                                <KeyRound className="w-5 h-5" />
                            </motion.div>
                            <div>
                                <h2 className="text-xl font-semibold tracking-tight">
                                    {variant === "out-of-credits" ? "Add Your API Key" : "API Key"}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {variant === "out-of-credits"
                                        ? "Keep creating subtitles with your own key."
                                        : "Enter your Together AI API key for fast transcription."}
                                </p>
                            </div>
                        </div>

                        {variant === "out-of-credits" && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4">
                                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                    Your free generation has been used.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Together AI offers free credits when you sign up — enough for hundreds of transcriptions.
                                </p>
                            </div>
                        )}

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
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 text-sm font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Your key is stored locally in your browser and never sent anywhere else.
                                </p>
                                <a
                                    href="https://api.together.ai/settings/api-keys"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-1"
                                >
                                    Get your API key from Together AI
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>

                            <motion.button
                                onClick={handleSave}
                                disabled={saved}
                                whileTap={{ scale: saved ? 1 : 0.98 }}
                                className="w-full bg-foreground text-background hover:opacity-90 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50"
                            >
                                <AnimatePresence mode="wait">
                                    {saved ? (
                                        <motion.span
                                            key="saved"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            Saved!
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="save"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            Save Key
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
