"use client";

import { useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ConfirmActionProps = {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  className?: string;
  variant?: "danger";
};

export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  className,
  variant = "danger"
}: ConfirmActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function confirm() {
    setIsOpen(false);
    buttonRef.current?.closest("form")?.requestSubmit();
  }

  return (
    <>
      <button
        className={className}
        onClick={() => setIsOpen(true)}
        ref={buttonRef}
        type="button"
      >
        {label}
      </button>
      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    variant === "danger" ? "bg-ember/10 text-ember" : "bg-surface-muted"
                  )}
                >
                  <AlertTriangle aria-hidden className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65">{description}</p>
                </div>
              </div>
              <button
                aria-label="Close confirmation"
                className="rounded-lg p-1.5 text-ink/50 hover:bg-surface-muted hover:text-ink"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-lg border border-border/80 bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                {cancelLabel}
              </button>
              <button
                className="rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-ember/90"
                onClick={confirm}
                type="button"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
