"use client";

import { AlertCircle } from "lucide-react";

import type { ActionResult } from "@/lib/errors";
import { cn } from "@/lib/utils";

type MessageResult = ActionResult<{ message: string }>;
export type ActionToast = {
  title: string;
  message: string;
  variant: "success" | "error" | "warning";
};

function getFieldErrors(state: MessageResult) {
  if (state.ok || !state.error.fieldErrors) {
    return [];
  }

  return Object.entries(state.error.fieldErrors).flatMap(([field, messages]) =>
    messages.map((message) => ({
      field,
      message
    }))
  );
}

export function ActionFeedback({ state }: { state: MessageResult }) {
  const fieldErrors = getFieldErrors(state);

  if (state.ok || !state.error.message) {
    return null;
  }

  return (
    <div
      className="mt-4 rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ink shadow-sm"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-ember" />
        <div className="min-w-0">
          <p className="font-bold text-ember">{state.error.message}</p>
          {fieldErrors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-ink/75">
              {fieldErrors.map((error) => (
                <li key={`${error.field}:${error.message}`}>
                  <span className="font-semibold">{error.field}</span>: {error.message}
                </li>
              ))}
            </ul>
          ) : null}
          {state.error.code !== "VALIDATION_ERROR" ? (
            <p className={cn("mt-1 text-xs font-semibold uppercase tracking-wide text-ink/45")}>
              {state.error.code}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function getActionToast(state: MessageResult): ActionToast | null {
  const message = state.ok ? state.data.message : state.error.message;
  if (!message) {
    return null;
  }

  if (state.ok) {
    return {
      title: "Saved",
      message,
      variant: "success"
    };
  }

  if (state.error.code === "VALIDATION_ERROR") {
    return {
      title: "Check the form",
      message,
      variant: "warning"
    };
  }

  return {
    title: "Action failed",
    message,
    variant: "error"
  };
}
