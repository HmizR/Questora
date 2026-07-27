import type { SubmissionRevision } from "@prisma/client";

import { formatTimestampLabel } from "@/lib/date-format";
import { readableStatus } from "@/lib/status-label";
import { ProtectedFileLink } from "@/components/ui/protected-file-link";
import { StatusBadge } from "@/components/ui/status-badge";

type RevisionView = Pick<
  SubmissionRevision,
  | "revisionNo"
  | "textContent"
  | "fileUrl"
  | "status"
  | "returnFeedback"
  | "returnedAt"
  | "submittedAt"
  | "createdAt"
>;

export function SubmissionRevisionList({
  activityId,
  revisions
}: {
  activityId: string;
  revisions: RevisionView[];
}) {
  if (revisions.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink/60">
        No previous versions yet.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {revisions.map((revision) => (
        <article
          className="rounded-lg border border-border/80 bg-surface p-4"
          key={revision.revisionNo}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold">Revision {revision.revisionNo}</h4>
              <StatusBadge tone="neutral">{readableStatus(revision.status)}</StatusBadge>
            </div>
            <span className="text-xs font-semibold text-ink/55">
              {formatTimestampLabel("Saved", revision.submittedAt ?? revision.createdAt)}
            </span>
          </div>
          {revision.textContent ? (
            <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-parchment p-3 text-sm leading-6">
              {revision.textContent}
            </div>
          ) : null}
          {revision.returnFeedback ? (
            <div className="mt-3 rounded-md border border-ember/20 bg-ember/10 p-3 text-sm leading-6">
              <p className="font-semibold text-ember">Returned feedback</p>
              {revision.returnedAt ? (
                <p className="mt-1 text-xs font-semibold text-ink/55">
                  {formatTimestampLabel("Returned", revision.returnedAt)}
                </p>
              ) : null}
              <div className="mt-2 whitespace-pre-wrap text-ink/75">
                {revision.returnFeedback}
              </div>
            </div>
          ) : null}
          {revision.fileUrl ? (
            <div className="mt-3">
              <ProtectedFileLink
                activityId={activityId}
                fileUrl={revision.fileUrl}
                intent="SUBMISSION"
                label="Open revision file"
              />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
