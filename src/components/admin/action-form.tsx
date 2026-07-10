"use client";

import { useActionState } from "react";

import { type AdminActionState, initialAdminActionState } from "@/app/admin/action-state";

type ActionFormProps = {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  children: React.ReactNode;
  className?: string;
};

export function ActionForm({ action, children, className }: ActionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialAdminActionState);

  return (
    <form action={formAction} className={className}>
      <fieldset className="space-y-5 disabled:opacity-70" disabled={isPending}>
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
