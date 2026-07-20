import { ActivityType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GradeSubmissionForm, PublishGradeForm } from "@/components/lecturer/forms";
import { AvatarImage } from "@/components/ui/avatar-image";
import { AnalyticsControls } from "@/components/ui/analytics-controls";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { ProtectedFileLink } from "@/components/ui/protected-file-link";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import { requireClassLecturer } from "@/lib/authorization-service";
import { formatTimestampLabel } from "@/lib/date-format";
import { db } from "@/lib/db";
import {
  matchesSearch,
  missionNeedsAttention,
  parseAnalyticsQuery,
  queryHref,
  sortByDirection
} from "@/lib/lecturer-analytics";
import { readableStatus } from "@/lib/status-label";

const submissionSorts = ["name", "submitted", "grade", "score"] as const;
const submissionStatuses = ["submitted", "not-submitted", "ungraded", "draft", "published"] as const;
type SubmissionSort = (typeof submissionSorts)[number];
type SubmissionStatusFilter = (typeof submissionStatuses)[number];

export default async function MissionSubmissionsPage({
  params,
  searchParams
}: {
  params: Promise<{ classId: string; moduleId: string; activityId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { classId, moduleId, activityId } = await params;
  const rawSearchParams = await searchParams;
  const rawStudentId = rawSearchParams.studentId;
  const studentId = Array.isArray(rawStudentId) ? rawStudentId[0] : rawStudentId;
  const query = parseAnalyticsQuery<SubmissionSort, SubmissionStatusFilter>(rawSearchParams, {
    defaultSort: "name",
    allowedSorts: submissionSorts,
    allowedStatuses: submissionStatuses
  });
  await requireClassLecturer(classId);

  const activity = await db.activity.findFirst({
    where: {
      id: activityId,
      moduleId,
      module: { classId }
    },
    include: { module: true }
  });

  if (
    !activity ||
    (activity.type !== ActivityType.ASSIGNMENT && activity.type !== ActivityType.PROJECT)
  ) {
    notFound();
  }

  const enrollments = await db.classStudent.findMany({
    where: { classId, status: "ACTIVE" },
    include: {
      student: {
        include: {
          submissions: {
            where: { activityId },
            take: 1
          },
          grades: {
            where: { activityId },
            take: 1
          }
        }
      }
    },
    orderBy: [{ student: { name: "asc" } }, { enrolledAt: "asc" }]
  });

  const enrichedEnrollments = enrollments.map((enrollment) => {
    const submissionEntry = enrollment.student.submissions[0];
    const gradeEntry = enrollment.student.grades[0];
    const state = gradeEntry?.publishedAt
      ? "published"
      : gradeEntry
        ? "draft"
        : submissionEntry
          ? "ungraded"
          : "not-submitted";
    const needsAttention = missionNeedsAttention({
      type: activity.type,
      dueAt: activity.dueAt,
      hasSubmission: Boolean(submissionEntry),
      hasGrade: Boolean(gradeEntry),
      gradePublishedAt: gradeEntry?.publishedAt
    });

    return {
      enrollment,
      submission: submissionEntry,
      grade: gradeEntry,
      state,
      needsAttention
    };
  });
  const filteredEnrollments = enrichedEnrollments.filter((row) => {
    if (!matchesSearch(row.enrollment.student, query.q)) return false;
    if (query.status === "submitted" && !row.submission) return false;
    if (query.status !== "all" && query.status !== "submitted" && row.state !== query.status) {
      return false;
    }
    if (query.attention === "needs-attention" && !row.needsAttention) return false;
    return true;
  });
  const sortedEnrollments = sortByDirection(filteredEnrollments, query.dir, (row) => {
    switch (query.sort) {
      case "submitted":
        return row.submission?.submittedAt ?? null;
      case "grade":
        return row.state;
      case "score":
        return row.grade ? Number(row.grade.score) : -1;
      default:
        return row.enrollment.student.name;
    }
  });
  const selectedEnrollment =
    sortedEnrollments.find((row) => row.enrollment.studentId === studentId)?.enrollment ??
    sortedEnrollments[0]?.enrollment;
  const selectedStudentId = selectedEnrollment?.studentId;

  const [submission, grade] = selectedStudentId
    ? await Promise.all([
        db.submission.findUnique({
          where: { activityId_studentId: { activityId, studentId: selectedStudentId } },
          include: { student: true }
        }),
        db.grade.findUnique({
          where: { activityId_studentId: { activityId, studentId: selectedStudentId } }
        })
      ])
    : [null, null];

  const returnTo = selectedStudentId
    ? `/lecturer/classes/${classId}/modules/${moduleId}/activities/${activityId}/submissions?studentId=${selectedStudentId}`
    : `/lecturer/classes/${classId}/modules/${moduleId}/activities/${activityId}/submissions`;
  const submittedCount = sortedEnrollments.filter((row) => row.submission).length;
  const gradedCount = sortedEnrollments.filter((row) => row.grade).length;
  const publishedCount = sortedEnrollments.filter((row) => row.grade?.publishedAt).length;
  const notSubmittedCount = Math.max(sortedEnrollments.length - submittedCount, 0);
  const summaryStats: Array<{ label: string; value: number; tone: StatusBadgeTone }> = [
    { label: "Submitted", value: submittedCount, tone: "success" },
    { label: "Not submitted", value: notSubmittedCount, tone: "neutral" },
    { label: "Graded", value: gradedCount, tone: "info" },
    { label: "Published", value: publishedCount, tone: "success" }
  ];

  function gradeBadge(gradeEntry: typeof grade, isSelected = false) {
    if (!gradeEntry) {
      return (
        <StatusBadge className={isSelected ? "border-white/25 bg-white/15 text-white" : ""} tone="warning">
          Ungraded
        </StatusBadge>
      );
    }

    return (
      <StatusBadge
        className={isSelected ? "border-white/25 bg-white/15 text-white" : ""}
        tone={gradeEntry.publishedAt ? "success" : "info"}
      >
        {gradeEntry.publishedAt ? "Published" : "Draft grade"}
      </StatusBadge>
    );
  }

  return (
    <DashboardShell
      title="Mission submissions"
      subtitle={`Review submissions for ${activity.title}.`}
    >
      <ClassTabs classId={classId} role="LECTURER" />
      <AnalyticsControls
        action={`/lecturer/classes/${classId}/modules/${moduleId}/activities/${activityId}/submissions`}
        exportHref={queryHref(
          `/api/lecturer/classes/${classId}/modules/${moduleId}/activities/${activityId}/submissions/export`,
          {
            q: query.q,
            status: query.status,
            attention: query.attention,
            sort: query.sort,
            dir: query.dir
          },
          {}
        )}
        query={query}
        sortOptions={[
          { label: "Name", value: "name" },
          { label: "Submitted time", value: "submitted" },
          { label: "Grade state", value: "grade" },
          { label: "Score", value: "score" }
        ]}
        statusOptions={[
          { label: "Submitted", value: "submitted" },
          { label: "Not submitted", value: "not-submitted" },
          { label: "Ungraded", value: "ungraded" },
          { label: "Draft grade", value: "draft" },
          { label: "Published", value: "published" }
        ]}
      />
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/modules`}
        >
          Back to regions
        </Link>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map(({ label, value, tone }) => (
          <div className="rounded-lg border border-border/80 bg-surface p-4 shadow-sm" key={label}>
            <StatusBadge tone={tone}>{label}</StatusBadge>
            <p className="mt-3 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <h2 className="font-bold">Students</h2>
          <div className="mt-4 space-y-2">
            {sortedEnrollments.length === 0 ? (
              <p className="text-sm text-ink/60">No active students enrolled.</p>
            ) : (
              sortedEnrollments.map(({ enrollment, needsAttention }) => {
                const studentSubmission = enrollment.student.submissions[0];
                const studentGrade = enrollment.student.grades[0];
                const isSelected = enrollment.studentId === selectedStudentId;

                return (
                  <Link
                    className={`block rounded-md border p-3 text-sm transition ${
                      isSelected
                        ? "border-ink bg-ink text-white"
                        : "border-ink/10 hover:bg-parchment"
                    }`}
                    href={queryHref(
                      `/lecturer/classes/${classId}/modules/${moduleId}/activities/${activityId}/submissions`,
                      {
                        q: query.q,
                        status: query.status,
                        attention: query.attention,
                        sort: query.sort,
                        dir: query.dir
                      },
                      { studentId: enrollment.studentId }
                    )}
                    key={enrollment.studentId}
                  >
                    <span className="flex items-center gap-2">
                      <AvatarImage
                        avatarUrl={enrollment.student.avatarUrl}
                        className={isSelected ? "border-white/25" : ""}
                        name={enrollment.student.name}
                        size="sm"
                      />
                      <span className="min-w-0 truncate font-semibold">{enrollment.student.name}</span>
                    </span>
                    <span className={isSelected ? "text-white/75" : "text-ink/60"}>
                      {studentSubmission ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            className={isSelected ? "border-white/25 bg-white/15 text-white" : ""}
                            tone="success"
                          >
                            Submitted
                          </StatusBadge>
                          <span>
                            {studentSubmission.submittedAt
                              ? formatTimestampLabel("Submitted", studentSubmission.submittedAt)
                              : "Submitted"}
                          </span>
                        </span>
                      ) : (
                        <StatusBadge
                          className={isSelected ? "border-white/25 bg-white/15 text-white" : ""}
                        >
                          Not submitted
                        </StatusBadge>
                      )}
                    </span>
                    <span className={isSelected ? "mt-1 block text-white/75" : "mt-1 block text-ink/60"}>
                      <span className="flex flex-wrap items-center gap-2">
                        {gradeBadge(studentGrade, isSelected)}
                        {studentGrade ? <span>Score {studentGrade.score.toString()}</span> : null}
                        {needsAttention ? <StatusBadge tone="warning">Needs attention</StatusBadge> : null}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          {!selectedEnrollment ? (
            <p className="text-sm text-ink/65">Select a student to review their submission.</p>
          ) : !submission ? (
            <div>
              <h2 className="text-lg font-bold">{selectedEnrollment.student.name}</h2>
              <p className="mt-2 text-sm text-ink/65">This student has not submitted yet.</p>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">{submission.student.name}</h2>
                  <div className="mt-3 flex items-center gap-3">
                    <AvatarImage
                      avatarUrl={submission.student.avatarUrl}
                      name={submission.student.name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold">{submission.student.name}</p>
                      <p className="text-sm text-ink/60">{submission.student.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink/65">
                    <StatusBadge tone="success">{readableStatus(submission.status)}</StatusBadge>
                    {submission.submittedAt ? (
                      <span>{formatTimestampLabel("Submitted", submission.submittedAt)}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 text-sm font-semibold text-ink/65 lg:items-end">
                  {gradeBadge(grade)}
                  {grade ? (
                    <>
                      <span>Score {grade.score.toString()}</span>
                      <span className="font-medium">
                        {grade.gradedAt ? formatTimestampLabel("Graded", grade.gradedAt) : "Graded"}
                      </span>
                      {grade.publishedAt ? (
                        <span className="font-medium">
                          {formatTimestampLabel("Published", grade.publishedAt)}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-border/80 bg-surface-muted p-4">
                <h3 className="text-sm font-bold">Submission timeline</h3>
                <div className="mt-3 grid gap-2 text-sm text-ink/65">
                  <p>{formatTimestampLabel("Submitted", submission.submittedAt)}</p>
                  {grade?.gradedAt ? <p>{formatTimestampLabel("Graded", grade.gradedAt)}</p> : null}
                  {grade?.publishedAt ? (
                    <p>{formatTimestampLabel("Published", grade.publishedAt)}</p>
                  ) : grade ? (
                    <p>Grade is saved as draft and is not visible to the student yet.</p>
                  ) : (
                    <p>No grade has been saved yet.</p>
                  )}
                </div>
              </div>

              {submission.textContent ? (
                <div className="mt-5 whitespace-pre-wrap rounded-md bg-parchment p-4 text-sm leading-6">
                  {submission.textContent}
                </div>
              ) : null}
              {submission.fileUrl ? (
                <div className="mt-4">
                  <ProtectedFileLink
                    activityId={activityId}
                    fileUrl={submission.fileUrl}
                    intent="SUBMISSION"
                    label="Open submitted file"
                  />
                </div>
              ) : null}

              <div className="mt-6">
                <GradeSubmissionForm returnTo={returnTo} submissionId={submission.id} />
              </div>
              {grade && !grade.publishedAt ? (
                <div className="mt-4">
                  <PublishGradeForm gradeId={grade.id} returnTo={returnTo} />
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
