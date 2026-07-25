"use client";

import { useRef, useState } from "react";

import {
  type LecturerActionState,
  initialLecturerActionState
} from "@/app/lecturer/action-state";
import { ActionFeedback, getActionToast } from "@/components/ui/action-feedback";
import {
  applyServerFieldErrors,
  clearFormFieldErrors,
  restoreSubmittedValues,
  showNativeFieldError
} from "@/components/ui/action-form-runtime";
import { useToast } from "@/components/ui/toast";

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
  const { showToast } = useToast();
  const [state, setState] = useState(initialLecturerActionState);
  const [isPending, setIsPending] = useState(false);
  const stateRef = useRef<LecturerActionState>(initialLecturerActionState);
  const formRef = useRef<HTMLFormElement>(null);

  async function formAction(formData: FormData) {
    setIsPending(true);
    try {
      const nextState = await action(stateRef.current, formData);
      stateRef.current = nextState;
      setState(nextState);

      if (formRef.current) {
        applyServerFieldErrors(formRef.current, nextState);
        if (!nextState.ok) {
          requestAnimationFrame(() => {
            if (formRef.current) {
              restoreSubmittedValues(formRef.current, formData);
            }
          });
        }
      }

      const toast = getActionToast(nextState);
      if (toast) {
        showToast(toast);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      action={formAction}
      className={className}
      ref={formRef}
      onInput={(event) => {
        const field = event.target;
        if (
          formRef.current &&
          (field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement)
        ) {
          showNativeFieldError(formRef.current, field);
        }
      }}
      onInvalid={(event) => {
        const field = event.target;
        if (
          formRef.current &&
          (field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement)
        ) {
          showNativeFieldError(formRef.current, field);
        }
      }}
      onBlur={(event) => {
        const field = event.target;
        if (
          formRef.current &&
          (field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement)
        ) {
          showNativeFieldError(formRef.current, field);
        }
      }}
      onSubmit={() => {
        if (formRef.current) {
          clearFormFieldErrors(formRef.current);
        }
      }}
    >
      <fieldset className="flex flex-col gap-4 disabled:opacity-70" disabled={isPending}>
        {children}
      </fieldset>
      <ActionFeedback state={state} />
    </form>
  );
}
