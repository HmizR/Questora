"use client";

import { Bot } from "lucide-react";

import { useAIAssistant } from "@/components/ai/ai-assistant-provider";

export function AIAssistantButton() {
  const { toggleAssistant } = useAIAssistant();

  return (
    <button
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-surface text-ink shadow-sm transition hover:bg-surface-muted"
      onClick={toggleAssistant}
      title="Open Questora Assistant"
      type="button"
    >
      <Bot aria-hidden className="h-4 w-4" />
      <span className="sr-only">Open Questora Assistant</span>
    </button>
  );
}
