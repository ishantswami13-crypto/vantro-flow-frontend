"use client";

import { useState, useEffect } from "react";
import { FiDownload, FiX } from "react-icons/fi";
import LogoMark from "@/components/LogoMark";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow]     = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      // Only show if not dismissed in last 7 days
      const dismissed = localStorage.getItem("vantro_install_dismissed");
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 86400000) {
        setTimeout(() => setShow(true), 3000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || installed) return null;

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShow(false);
  };

  const dismiss = () => {
    localStorage.setItem("vantro_install_dismissed", String(Date.now()));
    setShow(false);
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 z-50 animate-slide-up">
      <div className="card-premium p-4 border border-accent/30 shadow-2xl">
        <div className="flex items-start gap-3">
          <LogoMark size={36} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary">Install Vantro App</p>
            <p className="text-xs text-muted mt-0.5">Add to home screen for instant access, offline support &amp; push notifications.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all shadow-sm">
                <FiDownload size={11} /> Install Free
              </button>
              <button onClick={dismiss}
                className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-secondary hover:text-primary transition-all">
                Later
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="text-muted hover:text-primary transition-colors shrink-0">
            <FiX size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
