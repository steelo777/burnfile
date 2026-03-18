"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame, Upload, Key, Shield, Code, BookOpen,
  ChevronDown, ChevronRight, Zap, Lock, FileText,
  Globe, Terminal, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string;
  children?: NavItem[];
}

const NAV: NavItem[] = [
  {
    label: "Getting Started",
    children: [
      { label: "Overview",      href: "/",          icon: <BookOpen className="w-3.5 h-3.5" /> },
      { label: "How It Works",  href: "/#how",      icon: <Zap className="w-3.5 h-3.5" /> },
      { label: "Quick Start",   href: "/#upload",   icon: <Upload className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: "Core Concepts",
    children: [
      { label: "Burnfiles",     href: "/#burnfiles-section", icon: <Flame className="w-3.5 h-3.5" /> },
      { label: "Encryption",    href: "/#encryption",   icon: <Lock className="w-3.5 h-3.5" /> },
      { label: "Storage",       href: "/#storage",      icon: <Globe className="w-3.5 h-3.5" /> },
      { label: "Access Control",href: "/#access",       icon: <Shield className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: "Integrations",
    children: [
      { label: "Shelby Protocol", href: "https://docs.shelby.xyz", icon: <Globe className="w-3.5 h-3.5" />, badge: "External" },
      { label: "Aptos Testnet",   href: "https://aptoslabs.com",   icon: <Activity className="w-3.5 h-3.5" />, badge: "External" },
      { label: "SDK",             href: "/#sdk",                   icon: <Code className="w-3.5 h-3.5" />, badge: "Soon" },
      { label: "CLI",             href: "/#cli",                   icon: <Terminal className="w-3.5 h-3.5" />, badge: "Soon" },
    ],
  },
  {
    label: "API Reference",
    children: [
      { label: "Vault API",      href: "/#api",       icon: <FileText className="w-3.5 h-3.5" />, badge: "Soon" },
      { label: "Authentication", href: "/#auth",      icon: <Key className="w-3.5 h-3.5" />, badge: "Soon" },
    ],
  },
];

interface SidebarGroupProps {
  group: NavItem;
  pathname: string;
  defaultOpen?: boolean;
}

function SidebarGroup({ group, pathname, defaultOpen = true }: SidebarGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2 py-1 mb-1 group"
      >
        <span className="sidebar-group-label mt-0 mb-0">{group.label}</span>
        {open
          ? <ChevronDown className="w-3 h-3 text-[#6B7280] group-hover:text-[#9CA3AF] transition-colors" />
          : <ChevronRight className="w-3 h-3 text-[#6B7280] group-hover:text-[#9CA3AF] transition-colors" />
        }
      </button>
      {open && (
        <div className="space-y-0.5 animate-slide-down">
          {group.children?.map((item) => {
            const isActive = item.href === pathname || (item.href === "/" && pathname === "/");
            const isExternal = item.href?.startsWith("http");
            return (
              <Link
                key={item.label}
                href={item.href ?? "#"}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className={cn("sidebar-item", isActive && "active")}
              >
                <span className={cn("flex-shrink-0", isActive ? "text-[#BE185D]" : "text-[#6B7280]")}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: item.badge === "External"
                        ? "rgba(236,72,153,0.08)"
                        : "rgba(236,72,153,0.08)",
                      color: item.badge === "External" ? "#BE185D" : "#BE185D",
                      border: `1px solid ${item.badge === "External" ? "rgba(236,72,153,0.2)" : "rgba(236,72,153,0.15)"}`,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 py-4 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)" }}
        >
          <Flame className="w-3.5 h-3.5" style={{ color: "#BE185D" }} />
        </div>
        <div>
          <div className="font-mono font-bold text-sm text-[#E6EDF3] leading-none">burnfile</div>
          <div className="font-mono text-[10px] font-semibold mt-0.5" style={{ color: "#BE185D" }}>TESTNET</div>
        </div>
      </div>

      {/* Divider */}
      <div className="divider mx-3 mb-3" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1 pb-8">
        {NAV.map((group, i) => (
          <SidebarGroup key={group.label} group={group} pathname={pathname} defaultOpen={i < 2} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border-color)" }}>
        <a
          href="https://docs.shelby.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
        >
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          Powered by Shelby Protocol
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col"
        style={{
          width: "240px",
          flexShrink: 0,
          background: "var(--bg-primary)",
          borderRight: "1px solid var(--border-color)",
          position: "sticky",
          top: "56px",
          height: "calc(100vh - 56px)",
          overflowY: "auto",
        }}
      >
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <aside
            className="fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col lg:hidden animate-sidebar-in"
            style={{ background: "var(--bg-primary)", borderRight: "1px solid var(--border-color)" }}
          >
            {content}
          </aside>
        </>
      )}
    </>
  );
}
