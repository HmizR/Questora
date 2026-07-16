"use client";

import { useRef, useState } from "react";

import {
  initialAccountActionState,
  type AccountActionState
} from "@/app/account/action-state";
import { ActionFeedback, getActionToast } from "@/components/ui/action-feedback";
import { useToast } from "@/components/ui/toast";

type ActionFormProps = {
  action: (state: AccountActionState, formData: FormData) => Promise<AccountActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
};

export function AccountActionForm({
  action,
  children,
  className,
  resetOnSuccess = false
}: ActionFormProps) {
  const { showToast } = useToast();
  const [state, setState] = useState(initialAccountActionState);
  const [isPending, setIsPending] = useState(false);
  const stateRef = useRef<AccountActionState>(initialAccountActionState);
  const formRef = useRef<HTMLFormElement>(null);

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

      if (resetOnSuccess && nextState.ok) {
        formRef.current?.reset();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={formAction} className={className} ref={formRef}>
      <fieldset className="space-y-5 disabled:opacity-70" disabled={isPending}>
        {children}
      </fieldset>
      <ActionFeedback state={state} />
    </form>
  );
}
