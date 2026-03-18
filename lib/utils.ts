import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── File utils ───────────────────────────────────────────────────────────────

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileType(
  mimeType: string
): "image" | "video" | "audio" | "pdf" | "text" | "binary" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/") || mimeType === "application/json") return "text";
  return "binary";
}

export function getFileIcon(mimeType: string): string {
  const type = getFileType(mimeType);
  switch (type) {
    case "image": return "🖼";
    case "video": return "🎬";
    case "audio": return "🎵";
    case "pdf": return "📄";
    case "text": return "📝";
    default: return "📦";
  }
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// ─── Time utils ───────────────────────────────────────────────────────────────

export function formatTimestamp(secs: number): string {
  const date = new Date(secs * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(secs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - secs;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatTimestamp(secs);
}

export function timeUntil(secs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = secs - now;
  if (remaining <= 0) return "Expired";
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m remaining`;
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h remaining`;
  return `${Math.floor(remaining / 86400)}d remaining`;
}

// ─── Reads progress ───────────────────────────────────────────────────────────

export function readsPercent(readsCount: number, maxReads: number): number {
  if (maxReads === 0) return 0;
  return Math.min(100, (readsCount / maxReads) * 100);
}

export function readsColor(percent: number): string {
  if (percent < 50) return "text-emerald-400";
  if (percent < 80) return "text-amber-400";
  return "text-rose-400";
}

export function readsBarColor(percent: number): string {
  if (percent < 50) return "bg-emerald-500";
  if (percent < 80) return "bg-amber-500";
  return "bg-rose-500";
}

// ─── Async helpers ────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < retries - 1) await sleep(delay * Math.pow(2, i));
    }
  }
  throw last;
}
