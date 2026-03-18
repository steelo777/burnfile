"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Copy, ExternalLink, X, Flame, Shield, Clock } from "lucide-react";
import { cn, formatTimestamp } from "@/lib/utils";
import type { UploadResult } from "@/types";

interface ShareModalProps {
  result: UploadResult;
  maxReads: number;
  expiryTs: number;
  fileName: string;
  onClose: () => void;
}

export function ShareModal({
  result,
  maxReads,
  expiryTs,
  fileName,
  onClose,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trap focus
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const aptosExplorerUrl = `https://explorer.aptoslabs.com/txn/${result.txHash}?network=testnet`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vault created"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg card border-border-strong shadow-burn-lg animate-scale-in">
        {/* Glow */}
        <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-burn/20 to-transparent opacity-60 pointer-events-none" />

        <div className="relative p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 blur-lg bg-success/30 rounded-full" />
                <div className="relative w-10 h-10 rounded-full bg-success/10 border border-success/30 flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Vault Created</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your file is encrypted and stored on Shelby Protocol
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-surface-overlay flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Vault details */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                icon: Flame,
                label: "Max Reads",
                value: `${maxReads}×`,
                color: "text-burn",
              },
              {
                icon: Shield,
                label: "Encryption",
                value: "AES-256",
                color: "text-success",
              },
              {
                icon: Clock,
                label: "Expires",
                value: expiryTs === 0 ? "Never" : formatTimestamp(expiryTs),
                color: "text-amber",
              },
            ].map(({ icon: Icon, label, value, color }) => (
              <div
                key={label}
                className="rounded-lg bg-surface-raised border border-border p-3 space-y-1.5"
              >
                <Icon className={cn("w-3.5 h-3.5", color)} />
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
                    {label}
                  </p>
                  <p className={cn("text-xs font-semibold font-mono", color)}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Share link */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-mono">
              Share Link
            </p>
            <div className="flex gap-2">
              <div
                className="flex-1 rounded-lg bg-surface-raised border border-border px-3 py-2.5 text-xs font-mono text-muted-foreground truncate cursor-text select-all"
                onClick={() => {
                  const selection = window.getSelection();
                  const range = document.createRange();
                  // @ts-ignore
                  range.selectNodeContents(document.activeElement);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }}
              >
                {result.shareUrl}
              </div>
              <button
                ref={inputRef as React.RefObject<HTMLButtonElement>}
                onClick={handleCopy}
                className={cn(
                  "shrink-0 h-10 w-10 rounded-lg border flex items-center justify-center transition-all duration-200",
                  copied
                    ? "bg-success/10 border-success/30 text-success"
                    : "bg-surface-raised border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                )}
                aria-label="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* File info */}
          <div className="rounded-lg bg-surface-raised border border-border p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                Blob ID: {result.blobId.slice(0, 16)}…
              </p>
            </div>
            <a
              href={aptosExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-burn transition-colors duration-150 shrink-0 ml-3"
            >
              Aptos Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-burn/20 bg-burn/5 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-burn font-semibold">Save this link.</span> The
              encryption key lives in the URL fragment and is never stored anywhere. If
              you lose this link, the file cannot be recovered — by anyone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className={cn(
                "btn-burn flex-1 flex items-center justify-center gap-2 py-2.5",
                copied && "bg-success hover:bg-success"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied to clipboard
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy link
                </>
              )}
            </button>
            <button onClick={onClose} className="btn-ghost px-4 py-2.5">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
