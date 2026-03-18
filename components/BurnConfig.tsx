"use client";

import { useState } from "react";
import { Flame, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadConfig } from "@/types";

interface BurnConfigProps {
  config: UploadConfig;
  onChange: (config: UploadConfig) => void;
  disabled?: boolean;
}

const READ_PRESETS = [1, 3, 5, 10, 25];

const EXPIRY_OPTIONS = [
  { label: "Never", value: 0 },
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "30 days", value: 2592000 },
];

export function BurnConfig({ config, onChange, disabled }: BurnConfigProps) {
  const [showCustomReads, setShowCustomReads] = useState(false);
  const [customReads, setCustomReads] = useState("10");

  const readsLabel = config.maxReads === 1 ? "1 read" : `${config.maxReads} reads`;
  const expiryLabel =
    EXPIRY_OPTIONS.find((o) => o.value === config.expiryTs)?.label ?? "Custom";

  const handleExpiryChange = (deltaSeconds: number) => {
    const expiryTs = deltaSeconds === 0 ? 0 : Math.floor(Date.now() / 1000) + deltaSeconds;
    onChange({ ...config, expiryTs });
  };

  const handleCustomReadsSubmit = () => {
    const val = parseInt(customReads);
    if (isNaN(val) || val < 1 || val > 10000) return;
    onChange({ ...config, maxReads: val });
    setShowCustomReads(false);
  };

  return (
    <div className="space-y-5 animate-slide-up">

      {/* ── Max Reads ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span className="text-sm font-semibold text-foreground">Max Reads</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="badge-red font-mono text-[11px]">{readsLabel}</span>
            <div className="relative group">
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-56 p-2.5 card text-xs text-muted-foreground shadow-surface-lg hidden group-hover:block z-10">
                After this many reads, the file is permanently destroyed. Enforced by
                on-chain smart contract — no admin can override it.
              </div>
            </div>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex gap-2 flex-wrap">
          {READ_PRESETS.map((preset) => (
            <button
              key={preset}
              disabled={disabled}
              onClick={() => {
                onChange({ ...config, maxReads: preset });
                setShowCustomReads(false);
              }}
              className={cn(
                "h-9 px-4 rounded-lg text-xs font-mono font-semibold border transition-all duration-150",
                config.maxReads === preset
                  ? "bg-[rgba(94,234,212,0.1)] border-[rgba(94,234,212,0.4)] text-[#5EEAD4]"
                  : "border-[#202938] text-muted-foreground hover:border-border-strong hover:text-foreground"
              )}
            >
              {preset === 1 ? "1×" : `${preset}×`}
            </button>
          ))}
          <button
            disabled={disabled}
            onClick={() => setShowCustomReads((v) => !v)}
            className={cn(
              "h-9 px-4 rounded-lg text-xs font-mono font-semibold border transition-all duration-150",
              showCustomReads
                ? "bg-surface-overlay border-[#2D3748] text-[#E6EDF3]"
                : "border-[#202938] text-muted-foreground hover:border-border-strong hover:text-foreground"
            )}
          >
            Custom
          </button>
        </div>

        {/* Custom input */}
        {showCustomReads && (
          <div className="flex gap-2 animate-slide-down">
            <input
              type="number"
              min={1}
              max={10000}
              value={customReads}
              onChange={(e) => setCustomReads(e.target.value)}
              placeholder="e.g. 50"
              className="input-base w-28"
              onKeyDown={(e) => e.key === "Enter" && handleCustomReadsSubmit()}
              disabled={disabled}
            />
            <button
              onClick={handleCustomReadsSubmit}
              className="btn-ghost px-4 py-2 text-xs"
              disabled={disabled}
            >
              Set
            </button>
          </div>
        )}

        {/* Visual burn indicator */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1">
            <div className="burn-meter">
              <div
                className={cn(
                  "burn-meter-fill",
                  config.maxReads === 1
                    ? "w-full bg-gradient-to-r from-burn to-burn-light"
                    : config.maxReads <= 5
                    ? "bg-gradient-to-r from-amber to-amber-light"
                    : "bg-gradient-to-r from-success to-emerald-400"
                )}
                style={{
                  width:
                    config.maxReads === 1
                      ? "100%"
                      : config.maxReads <= 5
                      ? "60%"
                      : config.maxReads <= 25
                      ? "30%"
                      : "15%",
                }}
              />
            </div>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
            {config.maxReads === 1
              ? "Most secure"
              : config.maxReads <= 5
              ? "High security"
              : config.maxReads <= 25
              ? "Moderate"
              : "Low restriction"}
          </p>
        </div>
      </div>

      {/* ── Expiry ─────────────────────────────────────────────────────── */}
      <div className="h-px bg-border" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" style={{color:"#6B7280"}} />
            <span className="text-sm font-semibold text-foreground">Time Expiry</span>
            <span className="badge-muted text-[10px]">Optional</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{expiryLabel}</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {EXPIRY_OPTIONS.map(({ label, value }) => (
            <button
              key={label}
              disabled={disabled}
              onClick={() => handleExpiryChange(value)}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-mono border transition-all duration-150",
                // Match on whether calculated expiryTs corresponds to this option
                (value === 0 && config.expiryTs === 0) ||
                  (value > 0 &&
                    Math.abs(
                      config.expiryTs - (Math.floor(Date.now() / 1000) + value)
                    ) < 60)
                  ? "bg-surface-overlay border-[#2D3748] text-[#E6EDF3]"
                  : "border-[#202938] text-muted-foreground hover:border-border-strong hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
