"use client";

import { useActionState } from "react";

import {
  type StudentActionState,
  initialStudentActionState
} from "@/app/student/action-state";

type StudentAction = (
  state: StudentActionState,
  formData: FormData
) => Promise<StudentActionState>;

export function StudentActionForm({
  action,
  children,
  className
}: {
  action: StudentAction;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialStudentActionState);

  return (
    <form action={formAction} className={className}>
      <fieldset className="space-y-4 disabled:opacity-70" disabled={isPending}>
        {children}
      </fieldset>
      {!state.ok ? (
        <div className="mt-4 rounded-md border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
          {state.error.message}
        </div>
      ) : state.data.message ? (
        <div className="mt-4 rounded-md border border-moss/30 bg-moss/10 px-4 py-3 text-sm font-medium text-moss">
          {state.data.message}
        </div>
      ) : null}
    </form>
  );
}
