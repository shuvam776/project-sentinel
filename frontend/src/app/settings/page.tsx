"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/shell/AppShell";
import Header from "@/components/shell/Header";
import Button from "@/components/ui/Button";
import { fetchHealth } from "@/lib/api";
import { HealthInfo } from "@/types";

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthInfo | null>(null);

  // Settings State (stored in localStorage)
  const [timestampFormat, setTimestampFormat] = useState<"standard" | "seconds">("standard");
  const [showBoxesDefault, setShowBoxesDefault] = useState(true);
  const [showLabelsDefault, setShowLabelsDefault] = useState(true);
  const [rememberSearches, setRememberSearches] = useState(true);

  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => null);

    try {
      const stored = localStorage.getItem("sentinel.prefs.v1");
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.timestampFormat) setTimestampFormat(prefs.timestampFormat);
        if (prefs.showBoxesDefault !== undefined) setShowBoxesDefault(prefs.showBoxesDefault);
        if (prefs.showLabelsDefault !== undefined) setShowLabelsDefault(prefs.showLabelsDefault);
        if (prefs.rememberSearches !== undefined) setRememberSearches(prefs.rememberSearches);
      }
    } catch {
      // Ignore
    }
  }, []);

  const savePrefs = (updates: Record<string, unknown>) => {
    try {
      const current = JSON.parse(localStorage.getItem("sentinel.prefs.v1") || "{}");
      const next = { ...current, ...updates };
      localStorage.setItem("sentinel.prefs.v1", JSON.stringify(next));

      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1500);
    } catch {
      // Ignore
    }
  };

  const handleClearRecent = () => {
    try {
      localStorage.removeItem("sentinel.recent_queries");
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1500);
    } catch {
      // Ignore
    }
  };

  return (
    <AppShell>
      <Header title="Settings" />

      <div className="p-4 md:p-6 max-w-[720px] w-full space-y-8 select-none text-xs">
        {/* Saved Notice */}
        {savedNotice && (
          <div className="text-xs font-semibold text-success-text font-mono transition-opacity">
            ✓ Saved
          </div>
        )}

        {/* Section 1: Display */}
        <section className="space-y-4 border-b border-border-subtle pb-6">
          <h2 className="text-sm font-semibold text-txt-primary">Display</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-txt-primary">Timestamp format</div>
                <div className="text-txt-tertiary">Choose how timestamps are displayed across lists and the player.</div>
              </div>
              <div className="flex items-center bg-surface-inset border border-border-default rounded-sm p-0.5">
                <button
                  onClick={() => {
                    setTimestampFormat("standard");
                    savePrefs({ timestampFormat: "standard" });
                  }}
                  className={`px-2.5 py-1 rounded-xs font-mono text-xs transition-colors ${
                    timestampFormat === "standard"
                      ? "bg-surface-raised text-txt-primary font-medium"
                      : "text-txt-tertiary hover:text-txt-primary"
                  }`}
                >
                  00:12:41
                </button>
                <button
                  onClick={() => {
                    setTimestampFormat("seconds");
                    savePrefs({ timestampFormat: "seconds" });
                  }}
                  className={`px-2.5 py-1 rounded-xs font-mono text-xs transition-colors ${
                    timestampFormat === "seconds"
                      ? "bg-surface-raised text-txt-primary font-medium"
                      : "text-txt-tertiary hover:text-txt-primary"
                  }`}
                >
                  761.4 s
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-txt-primary">Show detection boxes by default</div>
                <div className="text-txt-tertiary">Draw object detection bounding boxes over video frames.</div>
              </div>
              <input
                type="checkbox"
                checked={showBoxesDefault}
                onChange={(e) => {
                  setShowBoxesDefault(e.target.checked);
                  savePrefs({ showBoxesDefault: e.target.checked });
                }}
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-txt-primary">Show box labels by default</div>
                <div className="text-txt-tertiary">Display object class and confidence scores attached to boxes.</div>
              </div>
              <input
                type="checkbox"
                checked={showLabelsDefault}
                onChange={(e) => {
                  setShowLabelsDefault(e.target.checked);
                  savePrefs({ showLabelsDefault: e.target.checked });
                }}
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Search */}
        <section className="space-y-4 border-b border-border-subtle pb-6">
          <h2 className="text-sm font-semibold text-txt-primary">Search</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-txt-primary">Remember recent searches</div>
                <div className="text-txt-tertiary">Store up to 5 recent queries locally in your browser.</div>
              </div>
              <input
                type="checkbox"
                checked={rememberSearches}
                onChange={(e) => {
                  setRememberSearches(e.target.checked);
                  savePrefs({ rememberSearches: e.target.checked });
                }}
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-txt-primary">Recent searches history</div>
                <div className="text-txt-tertiary">Clear saved query history.</div>
              </div>
              <Button variant="secondary" size="sm" onClick={handleClearRecent}>
                Clear recent searches
              </Button>
            </div>
          </div>
        </section>

        {/* Section 3: About */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-txt-primary">About</h2>

          <div className="space-y-3 bg-surface-inset border border-border-subtle rounded-sm p-4 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-txt-tertiary">Version</span>
              <span className="text-txt-primary">1.0.0 (MVP)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-tertiary">API Host</span>
              <span className="text-txt-primary">
                {process.env.API_URL
                  ? process.env.API_URL.replace(/^https?:\/\//, "").replace(/\/api\/v1\/?$/, "")
                  : typeof window !== "undefined"
                    ? window.location.host
                    : "127.0.0.1:8000"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-tertiary">Device</span>
              <span className="text-txt-primary">{health?.device_name || "CUDA GPU"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-tertiary">Embedding Model</span>
              <span className="text-txt-primary">{health?.clip_model || "openai/clip-vit-base-patch32"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-tertiary">Detector Model</span>
              <span className="text-txt-primary">{health?.detector_model || "torchvision/fasterrcnn_resnet50_fpn_v2"}</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
