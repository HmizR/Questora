import { getLevelProgress } from "@/lib/gamification";

export function LevelProgress({ totalXp }: { totalXp: number }) {
  const progress = getLevelProgress(totalXp);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">Experience</p>
          <h2 className="mt-1 text-3xl font-bold">Level {progress.level}</h2>
        </div>
        <p className="rounded-md bg-parchment px-3 py-2 text-sm font-semibold">
          {progress.totalXp} XP
        </p>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full bg-moss" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-ink/65">
        {progress.xpToNextLevel} XP to level {progress.level + 1}
      </p>
    </section>
  );
}
