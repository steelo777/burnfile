"use client";

import { useState } from "react";
import { ChevronDown, Eye, ExternalLink } from "lucide-react";
import { cn, truncateAddress, formatRelativeTime } from "@/lib/utils";
import type { AccessEvent } from "@/lib/aptos";

interface AccessLogProps {
  events: AccessEvent[];
  maxReads: number;
  className?: string;
}

export function AccessLog({ events, maxReads, className }: AccessLogProps) {
  const [expanded, setExpanded] = useState(false);
  const displayEvents = expanded ? events : events.slice(0, 3);

  if (events.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-surface/40 p-4", className)}>
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Access Log</span>
          <span className="badge-muted">0 reads</span>
        </div>
        <p className="text-xs text-muted-foreground">
          No reads recorded yet. Events are emitted on-chain and cannot be deleted.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface/40", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-raised/30 transition-colors duration-150 rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Access Log</span>
          <span className="badge-muted">{events.length} reads</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Events */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2 animate-slide-down">
          <div className="h-px bg-border" />
          <div className="space-y-1.5 pt-1">
            {displayEvents.map((event, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-raised/60 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  {/* Read index badge */}
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-mono text-muted-foreground font-bold">
                    {event.readIndex}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-foreground">
                        {truncateAddress(event.reader, 5)}
                      </span>
                      <a
                        href={`https://explorer.aptoslabs.com/account/${event.reader}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-burn transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(event.timestampSecs)}
                    </p>
                  </div>
                </div>

                {/* Reads remaining after this read */}
                <div className="text-[10px] font-mono text-muted-foreground text-right">
                  <span className="text-foreground font-semibold">
                    {event.readsRemaining}
                  </span>{" "}
                  / {maxReads} left
                </div>
              </div>
            ))}

            {events.length > 3 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 pt-1 text-center"
              >
                Show {events.length - 3} more events
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
