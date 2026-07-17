import {
  attemptQuizAction,
  completeLessonAction,
  startActivityAction,
  submitAssignmentAction
} from "@/app/student/actions";
import { StudentActionForm } from "@/components/student/action-form";
import { StudentSubmissionFileUpload } from "@/components/student/submission-file-upload";
import type { QuizDefinition } from "@/lib/quiz";

export function StartActivityForm({ activityId }: { activityId: string }) {
  return (
    <StudentActionForm action={startActivityAction}>
      <input name="activityId" type="hidden" value={activityId} />
      <button className="rounded-md border border-ink/20 bg-white px-4 py-2 text-sm font-semibold hover:bg-ink hover:text-white">
        Start mission
      </button>
    </StudentActionForm>
  );
}

export function CompleteLessonForm({ activityId }: { activityId: string }) {
  return (
    <StudentActionForm action={completeLessonAction}>
      <input name="activityId" type="hidden" value={activityId} />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Complete lesson
      </button>
    </StudentActionForm>
  );
}

export function SubmitAssignmentForm({
  activityId,
  defaultText,
  defaultFileUrl
}: {
  activityId: string;
  defaultText?: string | null;
  defaultFileUrl?: string | null;
}) {
  return (
    <StudentActionForm action={submitAssignmentAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="activityId" type="hidden" value={activityId} />
      <label className="block text-sm font-medium">
        Submission text
        <textarea
          className="mt-2 min-h-32 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
          name="textContent"
          defaultValue={defaultText ?? ""}
        />
      </label>
      <StudentSubmissionFileUpload activityId={activityId} defaultFileUrl={defaultFileUrl} />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Submit assignment
      </button>
    </StudentActionForm>
  );
}

export function AttemptQuizForm({
  activityId,
  quiz
}: {
  activityId: string;
  quiz: QuizDefinition | null;
}) {
  if (!quiz) {
    return (
      <section className="rounded-lg border border-ember/30 bg-ember/10 p-5 text-sm font-medium text-ember">
        This quiz has no valid questions yet.
      </section>
    );
  }

  return (
    <StudentActionForm action={attemptQuizAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="activityId" type="hidden" value={activityId} />
      <div className="space-y-5">
        {quiz.questions.map((question, index) => (
          <div className="rounded-lg border border-border/80 bg-surface-muted p-4" key={question.id}>
            <h3 className="text-sm font-bold">
              {index + 1}. {question.prompt}
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-moss">
              {question.points} point{question.points === 1 ? "" : "s"}
            </p>
            <div className="mt-3 space-y-2">
              {question.options.map((option, optionIndex) => (
                <label
                  className="flex items-center gap-2 rounded-md border border-border/80 bg-surface px-3 py-2 text-sm"
                  key={option}
                >
                  <input
                    name={`answer_${question.id}`}
                    required
                    type="radio"
                    value={optionIndex}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Submit quiz attempt
      </button>
    </StudentActionForm>
  );
}
