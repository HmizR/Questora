"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
};

type Toast = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, {
  icon: LucideIcon;
  className: string;
  iconClassName: string;
}> = {
  success: {
    icon: CheckCircle2,
    className: "border-moss/30 bg-moss/10 text-ink",
    iconClassName: "text-moss"
  },
  error: {
    icon: AlertCircle,
    className: "border-ember/35 bg-ember/10 text-ink",
    iconClassName: "text-ember"
  },
  warning: {
    icon: AlertCircle,
    className: "border-ember/35 bg-ember/10 text-ink",
    iconClassName: "text-ember"
  },
  info: {
    icon: Info,
    className: "border-steel/35 bg-steel/10 text-ink",
    iconClassName: "text-steel"
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = crypto.randomUUID();
      const nextToast: Toast = {
        id,
        variant: toast.variant ?? "info",
        title: toast.title,
        message: toast.message
      };

      setToasts((current) => [...current.slice(-3), nextToast]);
      window.setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions removals"
        className="pointer-events-none fixed inset-x-3 top-20 z-50 flex flex-col gap-3 sm:left-auto sm:right-5 sm:w-full sm:max-w-sm"
      >
        {toasts.map((toast) => {
          const styles = variantStyles[toast.variant];
          const Icon = styles.icon;

          return (
            <section
              className={cn(
                "pointer-events-auto rounded-2xl border bg-surface p-4 shadow-lg backdrop-blur",
                styles.className
              )}
              key={toast.id}
              role={toast.variant === "error" || toast.variant === "warning" ? "alert" : "status"}
            >
              <div className="flex items-start gap-3">
                <Icon aria-hidden className={cn("mt-0.5 h-5 w-5 shrink-0", styles.iconClassName)} />
                <div className="min-w-0 flex-1">
                  {toast.title ? <p className="text-sm font-bold">{toast.title}</p> : null}
                  <p className={cn("text-sm leading-5", toast.title ? "mt-1 text-ink/75" : "text-ink")}>
                    {toast.message}
                  </p>
                </div>
                <button
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-ink/45 transition hover:bg-surface-muted hover:text-ink"
                  onClick={() => dismissToast(toast.id)}
                  type="button"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
