import { Activity, BarChart3, CheckCircle2, Percent, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { AnalyticsControls, SortHeader } from "@/components/ui/analytics-controls";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/authorization-service";
import { AppError } from "@/lib/errors";
import {
  matchesSearch,
  missionNeedsAttention,
  parseAnalyticsQuery,
  queryHref,
  sortByDirection
} from "@/lib/lecturer-analytics";
import { getLecturerQuizAnalytics } from "@/services/quiz-analytics-service";

const quizSorts = ["name", "attempts", "best", "latest", "last-attempted"] as const;
const quizStatuses = ["passed", "not-passed", "not-started"] as const;
type QuizSort = (typeof quizSorts)[number];
type QuizStatus = (typeof quizStatuses)[number];

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDateTime(date?: Date | null) {
  if (!date) {
    return "No attempts";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default async function LecturerQuizAnalyticsPage({
  params,
  searchParams
}: {
  params: Promise<{ classId: string; moduleId: string; activityId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { classId, moduleId, activityId } = await params;
  const rawSearchParams = await searchParams;
  const query = parseAnalyticsQuery<QuizSort, QuizStatus>(rawSearchParams, {
    defaultSort: "name",
    allowedSorts: quizSorts,
    allowedStatuses: quizStatuses
  });
  const user = await requireRole("LECTURER");

  let data;
  try {
    data = await getLecturerQuizAnalytics({
      lecturerId: user.id,
      classId,
      moduleId,
      activityId
    });
  } catch (error) {
    if (error instanceof AppError && error.code !== "FORBIDDEN") {
      notFound();
    }

    throw error;
  }
  const pathname = `/lecturer/classes/${classId}/modules/${moduleId}/activities/${activityId}/quiz`;
  const queryRecord = {
    q: query.q,
    status: query.status,
    attention: query.attention,
    sort: query.sort,
    dir: query.dir
  };
  const rows = data.studentRows.map((row) => {
    const needsAttention = missionNeedsAttention({
      type: data.activity.type,
      dueAt: data.activity.dueAt,
      attemptsUsed: row.attemptsUsed,
      maxAttempts: data.activity.maxAttempts,
      hasPassed: row.hasPassed
    });
    const status = row.hasPassed ? "passed" : row.attemptsUsed > 0 ? "not-passed" : "not-started";
    return { ...row, needsAttention, status };
  });
  const filteredRows = rows.filter((row) => {
    if (!matchesSearch({ name: row.studentName, email: row.studentEmail }, query.q)) return false;
    if (query.status !== "all" && row.status !== query.status) return false;
    if (query.attention === "needs-attention" && !row.needsAttention) return false;
    return true;
  });
  const sortedRows = sortByDirection(filteredRows, query.dir, (row) => {
    switch (query.sort) {
      case "attempts":
        return row.attemptsUsed;
      case "best":
        return row.bestAttempt ? Number(row.bestAttempt.score) : -1;
      case "latest":
        return row.latestAttempt ? Number(row.latestAttempt.score) : -1;
      case "last-attempted":
        return row.latestAttempt?.submittedAt ?? null;
      default:
        return row.studentName;
    }
  });

  return (
    <DashboardShell
      title={`${data.activity.title} analytics`}
      subtitle="Review quiz attempts, pass rate, student performance, and question-level results."
    >
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/modules`}
        >
          Back to regions
        </Link>
      </div>
      <AnalyticsControls
        action={pathname}
        exportHref={queryHref(
          `/api/lecturer/classes/${classId}/modules/${moduleId}/activities/${activityId}/quiz/export`,
          queryRecord,
          {}
        )}
        query={query}
        sortOptions={[
          { label: "Name", value: "name" },
          { label: "Attempts", value: "attempts" },
          { label: "Best score", value: "best" },
          { label: "Latest score", value: "latest" },
          { label: "Last attempted", value: "last-attempted" }
        ]}
        statusOptions={[
          { label: "Passed", value: "passed" },
          { label: "Not passed", value: "not-passed" },
          { label: "Not started", value: "not-started" }
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          hint="Students with at least one attempt"
          icon={UsersRound}
          label="Participants"
          value={`${data.analytics.participantCount}/${data.activeStudentCount}`}
        />
        <StatCard
          hint="Total submitted quiz attempts"
          icon={Activity}
          label="Attempts"
          value={data.analytics.attemptCount}
        />
        <StatCard
          hint="Across all submitted attempts"
          icon={BarChart3}
          label="Average score"
          value={formatNumber(data.analytics.averageScore)}
        />
        <StatCard
          hint="Highest attempt score"
          icon={Trophy}
          label="Best score"
          value={formatNumber(data.analytics.bestScore)}
        />
        <StatCard
          hint="Students with a passing attempt"
          icon={Percent}
          label="Pass rate"
          value={formatPercent(data.analytics.passRate)}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-moss">Question breakdown</p>
            <h2 className="mt-1 text-xl font-bold">Per-question results</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink/60">
            <span>Completion rate</span>
            <StatusBadge tone="info">{formatPercent(data.analytics.completionRate)}</StatusBadge>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {data.analytics.questionBreakdown.map((question, index) => (
            <article className="rounded-xl border border-border/80 bg-surface-muted p-4" key={question.questionId}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-moss">
                    Question {index + 1} - {question.points} point{question.points === 1 ? "" : "s"}
                  </p>
                  <h3 className="mt-1 font-bold">{question.prompt}</h3>
                  <p className="mt-2 text-sm text-ink/65">Correct answer: {question.correctAnswer}</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-surface px-3 py-2 text-sm font-bold">
                  {formatPercent(question.correctRate)} correct
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {question.optionCounts.map((option) => {
                  const width =
                    question.totalResponses > 0
                      ? Math.round((option.count / question.totalResponses) * 100)
                      : 0;

                  return (
                    <div className="grid gap-2 sm:grid-cols-[180px_1fr_72px]" key={option.optionIndex}>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {option.optionIndex === question.correctOptionIndex ? (
                          <CheckCircle2 aria-hidden className="h-4 w-4 text-moss" />
                        ) : (
                          <span className="h-4 w-4" />
                        )}
                        {option.option}
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-border/60">
                        <div className="h-full bg-accent" style={{ width: `${width}%` }} />
                      </div>
                      <p className="text-sm text-ink/65">{option.count} picks</p>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="name">Student</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="attempts">Attempts</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="best">Best score</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="latest">Latest score</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="last-attempted">Last attempted</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">Attention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {sortedRows.map((row) => (
              <tr key={row.studentId}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{row.studentName}</p>
                  <p className="mt-1 text-xs text-ink/55">{row.studentEmail}</p>
                </td>
                <td className="px-4 py-3">{row.attemptsUsed}</td>
                <td className="px-4 py-3">
                  {row.bestAttempt
                    ? `${row.bestAttempt.score.toString()} / ${row.bestAttempt.maxScore.toString()}`
                    : "No attempts"}
                </td>
                <td className="px-4 py-3">
                  {row.latestAttempt
                    ? `${row.latestAttempt.score.toString()} / ${row.latestAttempt.maxScore.toString()}`
                    : "No attempts"}
                </td>
                <td className="px-4 py-3">
                  {row.hasPassed ? (
                    <StatusBadge tone="success">Passed</StatusBadge>
                  ) : row.attemptsUsed > 0 ? (
                    <StatusBadge tone="warning">Not passed</StatusBadge>
                  ) : (
                    <StatusBadge>Not started</StatusBadge>
                  )}
                </td>
                <td className="px-4 py-3">{formatDateTime(row.latestAttempt?.submittedAt)}</td>
                <td className="px-4 py-3">
                  {row.needsAttention ? (
                    <StatusBadge tone="warning">Needs attention</StatusBadge>
                  ) : (
                    <StatusBadge>Clear</StatusBadge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardShell>
  );
}
