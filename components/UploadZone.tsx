"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileText, Image, Film, Music, Archive, X } from "lucide-react";
import { cn, formatBytes, getFileType } from "@/lib/utils";
import type { FilePreview } from "@/types";

interface UploadZoneProps {
  onFileSelect: (file: File, preview: FilePreview) => void;
  onClear: () => void;
  selectedFile: File | null;
  disabled?: boolean;
}

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const type = getFileType(mimeType);
  const cls = cn("w-5 h-5 text-muted-foreground", className);
  switch (type) {
    case "image": return <Image className={cls} />;
    case "video": return <Film className={cls} />;
    case "audio": return <Music className={cls} />;
    default: return <FileText className={cls} />;
  }
}

function getMimeLabel(mimeType: string): string {
  const parts = mimeType.split("/");
  return parts[1]?.toUpperCase() ?? "FILE";
}

export function UploadZone({ onFileSelect, onClear, selectedFile, disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (file.size > MAX_SIZE) {
        setError(`File too large. Maximum size is ${formatBytes(MAX_SIZE)}.`);
        return;
      }
      const type = getFileType(file.type);
      const preview: FilePreview = { file, type };
      if (type === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
          onFileSelect(file, { ...preview, dataUrl: e.target?.result as string });
        };
        reader.readAsDataURL(file);
      } else {
        onFileSelect(file, preview);
      }
    },
    [onFileSelect]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  if (selectedFile) {
    return (
      <div className="relative rounded-2xl border border-border bg-surface/60 p-6 animate-scale-in">
        {/* Subtle glow */}
        <div className="absolute inset-0 rounded-2xl bg-success/3 pointer-events-none" />

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-surface-overlay border border-border flex items-center justify-center shrink-0">
            <FileIcon mimeType={selectedFile.type} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {selectedFile.name}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="badge-muted">
                {getMimeLabel(selectedFile.type) || "FILE"}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {formatBytes(selectedFile.size)}
              </span>
            </div>
          </div>

          {/* Clear */}
          <button
            onClick={onClear}
            className="w-7 h-7 rounded-lg hover:bg-surface-overlay flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("upload-zone p-12 text-center", dragging && "dragging")}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="Upload file"
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
        aria-hidden="true"
      />

      {/* Icon */}
      <div className="relative mx-auto w-14 h-14 mb-5">
        <div
          className={cn(
            "absolute inset-0 rounded-2xl bg-burn/5 blur-xl transition-all duration-300",
            dragging && "bg-burn/15 blur-2xl scale-110"
          )}
        />
        <div className="relative w-14 h-14 rounded-2xl bg-surface-overlay border border-border flex items-center justify-center">
          <Upload
            className={cn(
              "w-6 h-6 transition-all duration-300",
              dragging ? "text-burn scale-110" : "text-muted-foreground"
            )}
          />
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground mb-1">
        {dragging ? "Drop to upload" : "Drop your file here"}
      </p>
      <p className="text-xs text-muted-foreground">
        or{" "}
        <span className="text-foreground underline underline-offset-2 cursor-pointer">
          browse
        </span>{" "}
        · Any file type · Max 500 MB
      </p>

      {/* Supported types */}
      <div className="flex items-center justify-center gap-2 mt-5">
        {[
          { icon: Image, label: "Images" },
          { icon: Film, label: "Video" },
          { icon: Music, label: "Audio" },
          { icon: FileText, label: "Docs" },
          { icon: Archive, label: "Archives" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60"
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-xs font-medium text-burn animate-fade-in">{error}</p>
      )}
    </div>
  );
}
