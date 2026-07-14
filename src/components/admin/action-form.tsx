"use client";

import { useRef, useState } from "react";

import { type AdminActionState, initialAdminActionState } from "@/app/admin/action-state";
import { ActionFeedback, getActionToast } from "@/components/ui/action-feedback";
import { useToast } from "@/components/ui/toast";

type ActionFormProps = {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  children: React.ReactNode;
  className?: string;
};

export function ActionForm({ action, children, className }: ActionFormProps) {
  const { showToast } = useToast();
  const [state, setState] = useState(initialAdminActionState);
  const [isPending, setIsPending] = useState(false);
  const stateRef = useRef<AdminActionState>(initialAdminActionState);

  async function formAction(formData: FormData) {
    setIsPending(true);
    try {
      const nextState = await action(stateRef.current, formData);
      stateRef.current = nextState;
      setState(nextState);

      const toast = getActionToast(nextState);
      if (toast) {
        showToast(toast);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={formAction} className={className}>
      <fieldset className="space-y-5 disabled:opacity-70" disabled={isPending}>
        {children}
      </fieldset>
      <ActionFeedback state={state} />
    </form>
  );
}
