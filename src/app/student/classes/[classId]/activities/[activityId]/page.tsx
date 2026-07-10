import { ActivityType } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  AttemptQuizForm,
  CompleteLessonForm,
  StartActivityForm,
  SubmitAssignmentForm
} from "@/components/student/activity-forms";
import { StudentLinks } from "@/components/student/student-links";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { assertStudentCanAccessActivity } from "@/services/progress-service";

export default async function StudentActivityPage({
  params
}: {
  params: Promise<{ classId: string; activityId: string }>;
}) {
  const { classId, activityId } = await params;
  const { user } = await requireClassEnrollment(classId);

  let activity;
  try {
    activity = await assertStudentCanAccessActivity(activityId, user.id);
  } catch {
    notFound();
  }

  if (activity.module.classId !== classId) notFound();

  const [progress, submission, grade] = await Promise.all([
    db.activityProgress.findUnique({
      where: { activityId_studentId: { activityId, studentId: user.id } }
    }),
    db.submission.findUnique({
      where: { activityId_studentId: { activityId, studentId: user.id } }
    }),
    db.grade.findUnique({
      where: { activityId_studentId: { activityId, studentId: user.id } }
    })
  ]);

  const publishedGrade = grade?.publishedAt ? grade : null;

  return (
    <DashboardShell title={activity.title} subtitle={`${activity.type} mission in ${activity.module.title}`}>
      <StudentLinks classId={classId} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">{activity.type}</p>
          {activity.description ? <p className="mt-3 text-ink/70">{activity.description}</p> : null}
          {activity.content ? (
            <div className="mt-5 whitespace-pre-wrap rounded-md bg-parchment p-5 text-sm leading-6">
              {activity.content}
            </div>
          ) : null}
        </section>
        <aside className="space-y-5">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Mission status</h2>
            <p className="mt-2 text-sm text-ink/65">{progress?.status ?? "NOT_STARTED"}</p>
            <p className="mt-1 text-sm text-ink/65">{progress?.progressPercent ?? 0}% progress</p>
            {publishedGrade ? (
              <p className="mt-3 text-sm font-semibold text-moss">
                Grade: {publishedGrade.score.toString()}
              </p>
            ) : null}
            {publishedGrade?.feedback ? (
              <p className="mt-2 text-sm text-ink/65">{publishedGrade.feedback}</p>
            ) : null}
            <div className="mt-4">
              <StartActivityForm activityId={activity.id} />
            </div>
          </section>
          {activity.type === ActivityType.LESSON ? (
            <CompleteLessonForm activityId={activity.id} />
          ) : activity.type === ActivityType.ASSIGNMENT || activity.type === ActivityType.PROJECT ? (
            <SubmitAssignmentForm
              activityId={activity.id}
              defaultText={submission?.textContent}
              defaultFileUrl={submission?.fileUrl}
            />
          ) : activity.type === ActivityType.QUIZ ? (
            <AttemptQuizForm activityId={activity.id} />
          ) : null}
        </aside>
      </div>
    </DashboardShell>
  );
}
