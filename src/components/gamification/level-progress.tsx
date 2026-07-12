import { Sparkles } from "lucide-react";

import { getLevelProgress } from "@/lib/gamification";

export function LevelProgress({ totalXp }: { totalXp: number }) {
  const progress = getLevelProgress(totalXp);

  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-moss/10 text-moss">
            <Sparkles aria-hidden className="h-5 w-5" />
          </span>
          <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">Experience</p>
          <h2 className="mt-1 text-3xl font-bold">Level {progress.level}</h2>
          </div>
        </div>
        <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-semibold">
          {progress.totalXp} XP
        </p>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-ink/65">
        {progress.xpToNextLevel} XP to level {progress.level + 1}
      </p>
    </section>
  );
}
