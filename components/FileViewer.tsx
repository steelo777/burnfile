"use client";

import { useEffect, useState } from "react";
import { Download, FileText, AlertTriangle } from "lucide-react";
import { cn, getFileType, formatBytes } from "@/lib/utils";

interface FileViewerProps {
  data: Uint8Array;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

export function FileViewer({ data, mimeType, fileName, fileSize }: FileViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const fileType = getFileType(mimeType);

  useEffect(() => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    if (fileType === "text") {
      const decoder = new TextDecoder("utf-8");
      setTextContent(decoder.decode(data));
    }

    return () => URL.revokeObjectURL(url);
  }, [data, mimeType, fileType]);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* File header */}
      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-raised border border-border">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {mimeType} · {formatBytes(fileSize)}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 shrink-0 ml-4 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>

      {/* Content */}
      {fileType === "image" && objectUrl && (
        <div className="rounded-xl overflow-hidden bg-checkerboard border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={objectUrl}
            alt={fileName}
            className="w-full h-auto max-h-[600px] object-contain"
          />
        </div>
      )}

      {fileType === "video" && objectUrl && (
        <div className="rounded-xl overflow-hidden bg-black border border-border">
          <video
            src={objectUrl}
            controls
            className="w-full max-h-[500px]"
            playsInline
          />
        </div>
      )}

      {fileType === "audio" && objectUrl && (
        <div className="rounded-xl bg-surface-raised border border-border p-6">
          <audio src={objectUrl} controls className="w-full" />
        </div>
      )}

      {fileType === "pdf" && objectUrl && (
        <div className="rounded-xl overflow-hidden border border-border">
          <iframe
            src={objectUrl}
            title={fileName}
            className="w-full h-[600px]"
          />
        </div>
      )}

      {fileType === "text" && textContent !== null && (
        <div className="rounded-xl bg-surface-raised border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">{fileName}</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {textContent.split("\n").length} lines
            </span>
          </div>
          <pre className="p-4 text-xs font-mono text-foreground overflow-auto max-h-[500px] leading-relaxed whitespace-pre-wrap break-all">
            {textContent}
          </pre>
        </div>
      )}

      {fileType === "binary" && (
        <div className="rounded-xl bg-surface-raised border border-amber/20 p-5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Binary file — preview not available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This file type cannot be previewed in the browser. Click download to save it.
            </p>
          </div>
        </div>
      )}

      {/* Encryption proof */}
      <div className="rounded-xl border border-success/20 bg-success/5 p-3 flex items-start gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-success font-semibold">Decrypted locally.</span> The
          encryption key never left your browser. This read has been recorded
          on-chain and cannot be undone.
        </p>
      </div>
    </div>
  );
}
