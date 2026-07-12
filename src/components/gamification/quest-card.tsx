import { Trophy } from "lucide-react";

type QuestCardProps = {
  title: string;
  type: string;
  xpReward: number;
  completed: number;
  total: number;
};

export function QuestCard({ title, type, xpReward, completed, total }: QuestCardProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ember/10 text-ember">
            <Trophy aria-hidden className="h-4 w-4" />
          </span>
          <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-moss">{type}</p>
          <h3 className="mt-1 font-bold">{title}</h3>
          </div>
        </div>
        <p className="rounded-xl bg-surface-muted px-3 py-1.5 text-sm font-semibold text-ink/70">
          {xpReward} XP
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-ember" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-sm text-ink/60">
        {completed}/{total} required missions complete
      </p>
    </div>
  );
}
