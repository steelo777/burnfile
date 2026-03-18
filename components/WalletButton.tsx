"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Wallet, ChevronDown, Copy, LogOut, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { truncateAddress } from "@/lib/utils";

export function WalletButton() {
  const { connect, disconnect, account, connected, wallets } = useWallet();
  const [open, setOpen] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowConnect(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (!account?.address) return;
    navigator.clipboard.writeText(account.address.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dropdownStyle = {
    position: "absolute" as const,
    right: 0,
    top: "calc(100% + 8px)",
    width: "220px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "6px",
    zIndex: 50,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  };

  if (!connected) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setShowConnect((v) => !v)}
          className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Connect</span>
        </button>

        {showConnect && (
          <div style={dropdownStyle} className="animate-scale-in">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1.5"
              style={{ color: "var(--text-muted)" }}>
              Choose Wallet
            </p>
            {wallets?.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => { connect(wallet.name); setShowConnect(false); }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {wallet.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wallet.icon} alt={wallet.name} className="w-5 h-5 rounded" />
                )}
                <span className="font-medium">{wallet.name}</span>
              </button>
            ))}
            {(!wallets || wallets.length === 0) && (
              <p className="text-xs px-2 py-2" style={{ color: "var(--text-muted)" }}>
                Install{" "}
                <a href="https://petra.app" target="_blank" rel="noopener noreferrer"
                  style={{ color: "#5EEAD4" }}>Petra</a>{" "}
                to continue.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-150"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(236,72,153,0.3)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#202938")}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#22C55E" }} />
        <span>{truncateAddress(account?.address?.toString() ?? "", 4)}</span>
        <ChevronDown className="w-3 h-3" style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
      </button>

      {open && (
        <div style={dropdownStyle} className="animate-scale-in">
          <div className="px-2 py-2 space-y-0.5">
            <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Connected</p>
            <p className="text-xs font-mono break-all" style={{ color: "var(--text-primary)" }}>
              {truncateAddress(account?.address?.toString() ?? "", 8)}
            </p>
          </div>
          <div className="h-px mx-2 my-1" style={{ background: "#202938" }} />
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            {copied ? <Check className="w-3.5 h-3.5" style={{ color: "#22C55E" }} /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy address"}
          </button>
          <button
            onClick={() => { disconnect(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "#EF4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
