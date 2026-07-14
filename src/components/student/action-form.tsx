"use client";

import { useRef, useState } from "react";

import {
  type StudentActionState,
  initialStudentActionState
} from "@/app/student/action-state";
import { ActionFeedback, getActionToast } from "@/components/ui/action-feedback";
import { useToast } from "@/components/ui/toast";

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
  const { showToast } = useToast();
  const [state, setState] = useState(initialStudentActionState);
  const [isPending, setIsPending] = useState(false);
  const stateRef = useRef<StudentActionState>(initialStudentActionState);

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
      <fieldset className="space-y-4 disabled:opacity-70" disabled={isPending}>
        {children}
      </fieldset>
      <ActionFeedback state={state} />
    </form>
  );
}
