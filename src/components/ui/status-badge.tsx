import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: "border-border/80 bg-surface-muted text-ink/70",
  success: "border-moss/25 bg-moss/10 text-moss",
  warning: "border-ember/30 bg-ember/10 text-ember",
  danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  info: "border-steel/30 bg-steel/10 text-steel dark:text-blue-300"
};

export function StatusBadge({
  children,
  className,
  tone = "neutral"
}: {
  children: ReactNode;
  className?: string;
  tone?: StatusBadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
