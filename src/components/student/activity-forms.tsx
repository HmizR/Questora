import {
  attemptQuizAction,
  completeLessonAction,
  startActivityAction,
  submitAssignmentAction
} from "@/app/student/actions";
import { StudentActionForm } from "@/components/student/action-form";

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
      <label className="block text-sm font-medium">
        File URL
        <input
          className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
          name="fileUrl"
          defaultValue={defaultFileUrl ?? ""}
        />
      </label>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Submit assignment
      </button>
    </StudentActionForm>
  );
}

export function AttemptQuizForm({ activityId }: { activityId: string }) {
  return (
    <StudentActionForm action={attemptQuizAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="activityId" type="hidden" value={activityId} />
      <label className="block text-sm font-medium">
        Response
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
          name="response"
        />
      </label>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Submit quiz attempt
      </button>
    </StudentActionForm>
  );
}
