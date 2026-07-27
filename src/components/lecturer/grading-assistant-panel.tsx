"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Clipboard, Loader2, Sparkles } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";

const AIMarkdown = dynamic(
  () => import("@/components/ai/ai-markdown").then((module) => module.AIMarkdown),
  {
    ssr: false,
    loading: () => <span className="text-ink/65">Formatting suggestion...</span>
  }
);

type Source = {
  label: string;
  detail?: string;
};

type AssistantResponse =
  | {
      suggestion: string;
      sources: Source[];
    }
  | {
      error: {
        message: string;
      };
    };

export function GradingAssistantPanel({ submissionId }: { submissionId: string }) {
  const [suggestion, setSuggestion] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function draftFeedback() {
    setIsLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/lecturer/grading-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId })
      });
      const data = (await response.json()) as AssistantResponse;

      if (!response.ok || "error" in data) {
        setError("error" in data ? data.error.message : "The AI assistant is unavailable right now.");
        return;
      }

      setSuggestion(data.suggestion);
      setSources(data.sources ?? []);
    } catch {
      setError("The AI assistant is unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copySuggestion() {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion);
    } catch {
      // Some browser contexts block clipboard writes; the suggestion remains visible to copy manually.
    }
    setCopied(true);
  }

  return (
    <section className="rounded-xl border border-border/80 bg-surface-muted p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles aria-hidden className="h-4 w-4 text-moss" />
            <h3 className="text-sm font-bold">AI feedback helper</h3>
            <StatusBadge tone="info">Draft only</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Drafts review guidance for the latest submission. It never saves grades, publishes
            feedback, or suggests a score.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={draftFeedback}
          type="button"
        >
          {isLoading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          {isLoading ? "Drafting..." : suggestion ? "Regenerate draft" : "Draft feedback"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-ember/30 bg-ember/10 p-3 text-sm font-semibold text-ember">
          {error}
        </div>
      ) : null}

      {suggestion ? (
        <div className="mt-4 rounded-lg border border-border/80 bg-surface p-4">
          <div className="prose-sm max-w-none text-sm leading-6">
            <AIMarkdown content={suggestion} />
          </div>
          {sources.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sources.slice(0, 8).map((source, index) => (
                <span
                  className="max-w-full truncate rounded-full border border-border/80 bg-surface-muted px-2 py-1 text-xs font-semibold text-ink/65"
                  key={`${source.label}-${source.detail ?? index}`}
                  title={source.detail}
                >
                  {source.label}
                  {source.detail ? `: ${source.detail}` : ""}
                </span>
              ))}
            </div>
          ) : null}
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-border/80 bg-surface px-3 py-2 text-xs font-semibold hover:bg-surface-muted"
            onClick={copySuggestion}
            type="button"
          >
            <Clipboard aria-hidden className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy suggestion"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
