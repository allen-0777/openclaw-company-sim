"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

export function GlobalSetupCheck() {
  const { t } = useI18n();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const check = useCallback(() => {
    fetch("/api/gateway-health")
      .then((r) => r.json())
      .then((d) => {
        // Only show modal if strictly no CLI found AND gateway not responding
        if (!d.cliPath && d.status === "down") {
            setShowSetupModal(true);
        }
      })
      .catch(() => { /* ignore error, maybe offline */ });
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, 10000); // Check every 10s
    return () => clearInterval(timer);
  }, [check]);

  const handleCopy = () => {
    const cmd = "curl -fsSL https://openclaw.ai/install.sh | bash";
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    fetch("/api/setup-script/generate")
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "setup-openclaw.command";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(err => console.error("Failed to download setup script", err));
  };

  if (!showSetupModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={() => setShowSetupModal(false)}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ✕
        </button>
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🦞</div>
          <h2 className="text-xl font-bold mb-2">{t("gateway.setupTitle")}</h2>
          <p className="text-[var(--text-muted)] text-sm">
            {t("gateway.setupDesc")}
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-[var(--accent)]">Option A: Terminal</span>
              <button 
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {copied ? "✓ " + t("gateway.commandCopied") : "📋 " + t("gateway.copyCommand")}
              </button>
            </div>
            <code className="block text-sm font-mono break-all text-[var(--text)]">
              curl -fsSL https://openclaw.ai/install.sh | bash
            </code>
          </div>

          <div className="text-center text-xs text-[var(--text-muted)] my-2">
            - OR -
          </div>

          <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--accent)]">Option B: Script</span>
                <button
                  onClick={handleDownload}
                  className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  📥 {t("gateway.downloadScript")}
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {t("gateway.setupGuide")}
              </p>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={() => setShowSetupModal(false)}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
