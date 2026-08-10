"use client";

import { Radio } from "lucide-react";

interface RealtimeBadgeProps {
  isLive?: boolean;
  label?: string;
  className?: string;
}

export function RealtimeBadge({
  isLive = true,
  label = "Direct",
  className = "",
}: RealtimeBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 backdrop-blur-sm ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${
            isLive ? "" : "hidden"
          }`}
        ></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
      <span>{label}</span>
    </div>
  );
}
