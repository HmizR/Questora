import { StatusBadge } from "@/components/ui/status-badge";

type RubricBreakdownAssessment = {
  scores: Array<{
    id: string;
    score: { toString(): string };
    feedback: string | null;
    criterion: {
      title: string;
      description: string | null;
      maxPoints: { toString(): string };
      position: number;
    };
  }>;
};

export function RubricBreakdown({
  assessment,
  title = "Rubric breakdown"
}: {
  assessment?: RubricBreakdownAssessment | null;
  title?: string;
}) {
  if (!assessment) return null;

  const scores = [...assessment.scores].sort(
    (left, right) => left.criterion.position - right.criterion.position
  );

  return (
    <div className="rounded-lg border border-border/80 bg-surface-muted p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-3 space-y-2">
        {scores.map((score) => (
          <div className="rounded-md border border-border/80 bg-surface p-3 text-sm" key={score.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{score.criterion.title}</p>
                {score.criterion.description ? (
                  <p className="mt-1 text-xs text-ink/55">{score.criterion.description}</p>
                ) : null}
              </div>
              <StatusBadge tone="info">
                {score.score.toString()} / {score.criterion.maxPoints.toString()}
              </StatusBadge>
            </div>
            {score.feedback ? (
              <p className="mt-2 whitespace-pre-wrap text-ink/65">{score.feedback}</p>
            ) : (
              <p className="mt-2 text-ink/45">No criterion feedback.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
