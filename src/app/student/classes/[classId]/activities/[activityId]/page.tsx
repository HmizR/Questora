import { ActivityType } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  AttemptQuizForm,
  CompleteLessonForm,
  StartActivityForm,
  SubmitAssignmentForm
} from "@/components/student/activity-forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { parseQuizDefinition } from "@/lib/quiz";
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

  const [progress, submission, grade, quizAttempts] = await Promise.all([
    db.activityProgress.findUnique({
      where: { activityId_studentId: { activityId, studentId: user.id } }
    }),
    db.submission.findUnique({
      where: { activityId_studentId: { activityId, studentId: user.id } }
    }),
    db.grade.findUnique({
      where: { activityId_studentId: { activityId, studentId: user.id } }
    }),
    db.quizAttempt.findMany({
      where: { activityId, studentId: user.id },
      orderBy: { attemptNo: "desc" },
      take: 5
    })
  ]);

  const publishedGrade = grade?.publishedAt ? grade : null;
  const quiz = activity.type === ActivityType.QUIZ ? parseQuizDefinition(activity.content) : null;
  const displayContent =
    activity.type === ActivityType.QUIZ && quiz
      ? `${quiz.questions.length} question quiz. Passing score: ${
          activity.passingScore?.toString() ?? activity.maxScore?.toString() ?? "full score"
        }.`
      : activity.content;
  const remainingAttempts =
    activity.maxAttempts && activity.type === ActivityType.QUIZ
      ? Math.max(activity.maxAttempts - quizAttempts.length, 0)
      : null;
  const hasQuizAttemptsRemaining = remainingAttempts === null || remainingAttempts > 0;

  return (
    <DashboardShell title={activity.title} subtitle={`${activity.type} mission in ${activity.module.title}`}>
      <ClassTabs classId={classId} role="STUDENT" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">{activity.type}</p>
          {activity.description ? <p className="mt-3 text-ink/70">{activity.description}</p> : null}
          {displayContent ? (
            <div className="mt-5 whitespace-pre-wrap rounded-md bg-parchment p-5 text-sm leading-6">
              {displayContent}
            </div>
          ) : null}
          {activity.type === ActivityType.QUIZ && hasQuizAttemptsRemaining ? (
            <div className="mt-6">
              <AttemptQuizForm activityId={activity.id} quiz={quiz} />
            </div>
          ) : activity.type === ActivityType.QUIZ ? (
            <div className="mt-6 rounded-lg border border-ember/30 bg-ember/10 p-5 text-sm font-medium text-ember">
              You have used all attempts for this quiz. Your highest attempt is recorded as your
              quiz grade.
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
            {quizAttempts[0] ? (
              <p className="mt-3 text-sm text-ink/65">
                Latest quiz score: {quizAttempts[0].score.toString()} /{" "}
                {quizAttempts[0].maxScore.toString()} ({quizAttempts[0].passed ? "passed" : "not passed"})
              </p>
            ) : null}
            {activity.type === ActivityType.QUIZ ? (
              <p className="mt-3 text-sm text-ink/65">
                Attempts: {quizAttempts.length}
                {activity.maxAttempts
                  ? ` / ${activity.maxAttempts} (${remainingAttempts} remaining)`
                  : " / unlimited"}
              </p>
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
          ) : activity.type === ActivityType.QUIZ && quizAttempts.length > 0 ? (
            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
              <h2 className="font-bold">Recent attempts</h2>
              <div className="mt-3 space-y-2 text-sm">
                {quizAttempts.map((attempt) => (
                  <div className="flex justify-between gap-3" key={attempt.id}>
                    <span>Attempt {attempt.attemptNo}</span>
                    <span className={attempt.passed ? "font-semibold text-moss" : "text-ink/65"}>
                      {attempt.score.toString()} / {attempt.maxScore.toString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </DashboardShell>
  );
}
