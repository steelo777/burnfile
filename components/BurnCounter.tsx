"use client";

import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { cn, readsPercent, readsBarColor, readsColor } from "@/lib/utils";

interface BurnCounterProps {
  readsCount: number;
  maxReads: number;
  isBurned: boolean;
  className?: string;
}

export function BurnCounter({ readsCount, maxReads, isBurned, className }: BurnCounterProps) {
  const remaining = maxReads - readsCount;
  const percent = readsPercent(readsCount, maxReads);
  const prevPercent = useRef(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (percent !== prevPercent.current) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 600);
      prevPercent.current = percent;
      return () => clearTimeout(t);
    }
  }, [percent]);

  if (isBurned) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#EF4444]" />
            <span className="text-sm font-semibold text-[#EF4444]">Vault Destroyed</span>
          </div>
          <span className="badge-red">BURNED</span>
        </div>
        <div className="burn-meter">
          <div className="burn-meter-fill w-full bg-[#EF4444]" />
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          All {maxReads} reads consumed. This vault no longer exists.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={cn("w-4 h-4 transition-colors duration-300", readsColor(percent))} />
          <span className="text-sm font-semibold text-foreground">Reads Remaining</span>
        </div>
        <div className={cn("font-mono text-sm font-bold transition-all duration-300", readsColor(percent))}>
          <span className={cn("inline-block", animating && "animate-count-down")}>
            {remaining}
          </span>
          <span className="text-muted-foreground font-normal text-xs"> / {maxReads}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="burn-meter">
        <div
          className={cn("burn-meter-fill transition-all duration-700 ease-out", readsBarColor(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Status message */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-mono text-muted-foreground">
          {percent === 0 && "No reads yet"}
          {percent > 0 && percent < 50 && `${readsCount} read${readsCount !== 1 ? "s" : ""} used`}
          {percent >= 50 && percent < 80 && "Getting close to the limit"}
          {percent >= 80 && remaining > 0 && `⚠ Only ${remaining} read${remaining !== 1 ? "s" : ""} left`}
        </p>
        {percent > 0 && (
          <div className={cn("badge font-mono text-[10px]", readsColor(percent) === "text-[#5EEAD4]" ? "badge-green" : readsColor(percent) === "text-amber-400" ? "badge-amber" : "badge-red")}>
            {Math.round(percent)}% used
          </div>
        )}
      </div>
    </div>
  );
}
