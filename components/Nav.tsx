"use client";

import Link from "next/link";
import { Flame, Menu } from "lucide-react";
import { WalletButton } from "./WalletButton";

interface NavProps {
  onMenuClick?: () => void;
}

export function Nav({ onMenuClick }: NavProps) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center h-14 px-4 lg:px-6 gap-4"
      style={{
        background: "rgba(250, 247, 242, 0.95)",
        borderBottom: "1px solid var(--border-color)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Mobile hamburger — only shown on small screens */}
      <button
        className="btn-ghost lg:hidden p-2 -ml-2"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "rgba(236,72,153,0.08)",
            border: "1px solid rgba(236,72,153,0.2)",
          }}
        >
          <Flame className="w-3.5 h-3.5" style={{ color: "#BE185D" }} strokeWidth={2.5} />
        </div>
        <span className="font-mono font-bold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>
          burnfile
        </span>
        <span
          className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(236,72,153,0.08)",
            border: "1px solid rgba(236,72,153,0.25)",
            color: "#EC4899",
          }}
        >
          TESTNET
        </span>
      </Link>

      <div className="flex-1" />

      {/* Right nav links */}
      <nav className="hidden sm:flex items-center gap-1">
        {[
          { label: "Docs",   href: "https://docs.shelby.xyz" },
          { label: "GitHub", href: "https://github.com/yourusername/burnfile" },
        ].map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs px-3 py-1.5"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="w-px h-5 flex-shrink-0 hidden sm:block" style={{ background: "var(--border-color)" }} />
      <WalletButton />
    </header>
  );
}
