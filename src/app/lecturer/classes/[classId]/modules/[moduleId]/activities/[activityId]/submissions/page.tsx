import { ActivityType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GradeSubmissionForm, PublishGradeForm } from "@/components/lecturer/forms";
import { AvatarImage } from "@/components/ui/avatar-image";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { ProtectedFileLink } from "@/components/ui/protected-file-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireClassLecturer } from "@/lib/authorization-service";
import { formatTimestampLabel } from "@/lib/date-format";
import { db } from "@/lib/db";
import { readableStatus } from "@/lib/status-label";

export default async function MissionSubmissionsPage({
  params,
  searchParams
}: {
  params: Promise<{ classId: string; moduleId: string; activityId: string }>;
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { classId, moduleId, activityId } = await params;
  const { studentId } = await searchParams;
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

  const selectedEnrollment =
    enrollments.find((enrollment) => enrollment.studentId === studentId) ?? enrollments[0];
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
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/modules`}
        >
          Back to regions
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <h2 className="font-bold">Students</h2>
          <div className="mt-4 space-y-2">
            {enrollments.length === 0 ? (
              <p className="text-sm text-ink/60">No active students enrolled.</p>
            ) : (
              enrollments.map((enrollment) => {
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
                    href={`/lecturer/classes/${classId}/modules/${moduleId}/activities/${activityId}/submissions?studentId=${enrollment.studentId}`}
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
