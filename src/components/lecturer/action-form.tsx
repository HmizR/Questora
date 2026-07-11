"use client";

import { useActionState } from "react";

import {
  type LecturerActionState,
  initialLecturerActionState
} from "@/app/lecturer/action-state";

type LecturerAction = (
  state: LecturerActionState,
  formData: FormData
) => Promise<LecturerActionState>;

export function LecturerActionForm({
  action,
  children,
  className
}: {
  action: LecturerAction;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialLecturerActionState);

  return (
    <form action={formAction} className={className}>
      <fieldset className="flex flex-col gap-4 disabled:opacity-70" disabled={isPending}>
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
