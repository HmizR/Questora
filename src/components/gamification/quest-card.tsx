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
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-moss">{type}</p>
          <h3 className="mt-1 font-bold">{title}</h3>
        </div>
        <p className="text-sm font-semibold text-ink/70">{xpReward} XP</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full bg-ember" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-sm text-ink/60">
        {completed}/{total} required missions complete
      </p>
    </div>
  );
}
