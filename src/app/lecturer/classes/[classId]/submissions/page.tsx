import { notFound } from "next/navigation";

import { GradeSubmissionForm, PublishGradeForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { Expander } from "@/components/ui/expander";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerSubmissionsPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId }
  });

  if (!teachingClass) notFound();

  const submissions = await db.submission.findMany({
    where: { activity: { module: { classId } } },
    include: {
      student: true,
      activity: true
    },
    orderBy: [{ activity: { position: "asc" } }, { updatedAt: "desc" }]
  });

  const grades = await db.grade.findMany({
    where: { activity: { module: { classId } } }
  });
  const gradeByKey = new Map(grades.map((grade) => [`${grade.activityId}:${grade.studentId}`, grade]));
  const groupedSubmissions = submissions.reduce<
    Array<{ activityId: string; activityTitle: string; activityType: string; submissions: typeof submissions }>
  >((groups, submission) => {
    const existing = groups.find((group) => group.activityId === submission.activityId);
    if (existing) {
      existing.submissions.push(submission);
      return groups;
    }

    groups.push({
      activityId: submission.activityId,
      activityTitle: submission.activity.title,
      activityType: submission.activity.type,
      submissions: [submission]
    });
    return groups;
  }, []);

  return (
    <DashboardShell title="Submissions" subtitle="Review submissions, give feedback, and publish grades.">
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="space-y-4">
        {groupedSubmissions.length === 0 ? (
          <section className="rounded-lg border border-ink/10 bg-white p-6 text-sm text-ink/65 shadow-sm">
            No submissions yet.
          </section>
        ) : (
          groupedSubmissions.map((group, index) => (
            <Expander
              defaultOpen={index === 0}
              key={group.activityId}
              meta={`${group.activityType} - ${group.submissions.length} submissions`}
              title={group.activityTitle}
            >
              <div className="space-y-4">
                {group.submissions.map((submission) => {
                  const grade = gradeByKey.get(`${submission.activityId}:${submission.studentId}`);
                  return (
                    <section className="rounded-lg border border-ink/10 p-5" key={submission.id}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold">{submission.student.name}</p>
                          <p className="mt-1 text-sm text-ink/65">{submission.status}</p>
                        </div>
                        <div className="text-sm text-ink/65">
                          {grade ? (
                            <span>
                              Score: {grade.score.toString()} -{" "}
                              {grade.publishedAt ? "Published" : "Draft grade"}
                            </span>
                          ) : (
                            <span>Ungraded</span>
                          )}
                        </div>
                      </div>
                      {submission.textContent ? (
                        <div className="mt-4 rounded-md bg-parchment p-4 text-sm leading-6">
                          {submission.textContent}
                        </div>
                      ) : null}
                      {submission.fileUrl ? (
                        <a
                          className="mt-3 inline-block text-sm font-semibold text-moss hover:underline"
                          href={submission.fileUrl}
                        >
                          Submitted file
                        </a>
                      ) : null}
                      <div className="mt-5">
                        <GradeSubmissionForm submissionId={submission.id} />
                      </div>
                      {grade && !grade.publishedAt ? (
                        <div className="mt-4">
                          <PublishGradeForm gradeId={grade.id} />
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </Expander>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
