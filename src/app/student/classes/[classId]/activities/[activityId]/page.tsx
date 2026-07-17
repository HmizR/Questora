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
import { StatusBadge } from "@/components/ui/status-badge";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { formatDateTime, formatTimestampLabel } from "@/lib/date-format";
import { canStudentEditSubmission } from "@/lib/domain-rules";
import { db } from "@/lib/db";
import { canRevealQuizCorrectAnswers, parseStoredQuizAttempt } from "@/lib/quiz-analytics";
import { parseQuizDefinition } from "@/lib/quiz";
import { readableStatus } from "@/lib/status-label";
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
  const canEditSubmission = canStudentEditSubmission(submission?.status);
  const hasPassedQuiz = quizAttempts.some((attempt) => attempt.passed);
  const revealQuizAnswers = canRevealQuizCorrectAnswers({
    hasPassed: hasPassedQuiz,
    remainingAttempts
  });
  const parsedQuizAttempts =
    activity.type === ActivityType.QUIZ && quiz
      ? quizAttempts.map((attempt) => parseStoredQuizAttempt(attempt))
      : [];

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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge tone={progress?.status === "COMPLETED" ? "success" : "neutral"}>
                {readableStatus(progress?.status ?? "NOT_STARTED")}
              </StatusBadge>
              {publishedGrade ? <StatusBadge tone="success">Published grade</StatusBadge> : null}
              {!publishedGrade ? <StatusBadge>No published grade</StatusBadge> : null}
            </div>
            <p className="mt-1 text-sm text-ink/65">{progress?.progressPercent ?? 0}% progress</p>
            {publishedGrade ? (
              <p className="mt-3 text-sm font-semibold text-moss">
                Grade: {publishedGrade.score.toString()}
              </p>
            ) : null}
            {!publishedGrade ? (
              <p className="mt-3 text-sm text-ink/65">
                A grade will appear here after your lecturer publishes it.
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
            canEditSubmission ? (
              <div className="space-y-3">
                {submission ? (
                  <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone="success">{readableStatus(submission.status)}</StatusBadge>
                      <StatusBadge tone="info">Editable until graded</StatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-ink/65">
                      {formatTimestampLabel("Submitted", submission.submittedAt)}
                    </p>
                  </section>
                ) : (
                  <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                    <StatusBadge>Not submitted</StatusBadge>
                    <p className="mt-2 text-sm text-ink/65">
                      You can edit your submission until a lecturer grades it.
                    </p>
                  </section>
                )}
                <SubmitAssignmentForm
                  activityId={activity.id}
                  defaultText={submission?.textContent}
                  defaultFileUrl={submission?.fileUrl}
                />
              </div>
            ) : (
              <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">Submission locked</h2>
                  <StatusBadge tone="success">Graded</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-ink/65">
                  This work has been graded and can no longer be edited.
                </p>
                {submission?.submittedAt ? (
                  <p className="mt-2 text-sm text-ink/65">
                    {formatTimestampLabel("Submitted", submission.submittedAt)}
                  </p>
                ) : null}
                {submission?.textContent ? (
                  <div className="mt-4 whitespace-pre-wrap rounded-md bg-parchment p-4 text-sm leading-6">
                    {submission.textContent}
                  </div>
                ) : null}
                {submission?.fileUrl ? (
                  <p className="mt-3 break-all text-sm text-ink/65">File URL: {submission.fileUrl}</p>
                ) : null}
              </section>
            )
          ) : activity.type === ActivityType.QUIZ && quizAttempts.length > 0 ? (
            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
              <h2 className="font-bold">Attempt history</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead className="text-xs font-bold uppercase tracking-wide text-ink/50">
                    <tr>
                      <th className="py-2 pr-3">Attempt</th>
                      <th className="py-2 pr-3">Score</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {parsedQuizAttempts.map((attempt) => (
                      <tr key={attempt.id ?? attempt.attemptNo}>
                        <td className="py-2 pr-3">{attempt.attemptNo}</td>
                        <td className="py-2 pr-3 font-semibold">
                          {attempt.score.toString()} / {attempt.maxScore.toString()}
                        </td>
                        <td className="py-2 pr-3">
                          <StatusBadge tone={attempt.passed ? "success" : "warning"}>
                            {attempt.passed ? "Passed" : "Not passed"}
                          </StatusBadge>
                        </td>
                        <td className="py-2 text-ink/65">
                          {formatDateTime(attempt.submittedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-3">
                {parsedQuizAttempts.map((attempt) => (
                  <details
                    className="rounded-lg border border-border/80 bg-surface-muted p-3"
                    key={`review-${attempt.id ?? attempt.attemptNo}`}
                  >
                    <summary className="cursor-pointer list-none text-sm font-bold">
                      Review attempt {attempt.attemptNo}
                      <span className="ml-2 text-xs font-medium text-ink/55">
                        {formatDateTime(attempt.submittedAt)}
                      </span>
                    </summary>
                    <div className="mt-3 space-y-3">
                      {quiz?.questions.map((question, index) => {
                        const result = attempt.results.find((entry) => entry.questionId === question.id);
                        const selectedIndex = result?.selectedOptionIndex ?? attempt.selected[question.id];
                        const selectedAnswer =
                          selectedIndex !== undefined
                            ? question.options[selectedIndex] ?? "Unknown option"
                            : "No answer";
                        const correctAnswer = question.options[question.correctOptionIndex] ?? "Unknown";

                        return (
                          <div className="rounded-md border border-border/80 bg-surface p-3 text-sm" key={question.id}>
                            <p className="font-semibold">
                              {index + 1}. {question.prompt}
                            </p>
                            <p className="mt-2 text-ink/65">Your answer: {selectedAnswer}</p>
                            {revealQuizAnswers ? (
                              <p className="mt-1 text-ink/65">Correct answer: {correctAnswer}</p>
                            ) : (
                              <p className="mt-1 text-ink/55">
                                Correct answer hidden while attempts remain.
                              </p>
                            )}
                            <p className={result?.isCorrect ? "mt-1 font-semibold text-moss" : "mt-1 text-ember"}>
                              {result?.pointsAwarded ?? 0} / {result?.pointsPossible ?? question.points} points
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </DashboardShell>
  );
}
