"use client";

import dynamic from "next/dynamic";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, Square, Trash2, X } from "lucide-react";

import { useAIAssistant } from "@/components/ai/ai-assistant-provider";

const starterPrompts = ["Summarize this", "Explain simply", "Quiz me", "Give me a hint"];
const AIMarkdown = dynamic(
  () => import("@/components/ai/ai-markdown").then((module) => module.AIMarkdown),
  {
    ssr: false,
    loading: () => <span className="text-ink/65">Formatting response...</span>
  }
);

export function AIAssistantDrawer() {
  const {
    clearMessages,
    closeAssistant,
    contextLabel,
    error,
    isOpen,
    isSending,
    messages,
    sendMessage,
    stopGenerating
  } = useAIAssistant();
  const [draft, setDraft] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  async function submitMessage(message: string) {
    if (!message.trim()) return;

    setDraft("");
    await sendMessage(message);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(draft);
  }

  async function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    await submitMessage(draft);
  }

  useEffect(() => {
    if (isOpen) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isOpen, messages, isSending]);

  if (!isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <button
        aria-label="Close Questora Assistant"
        className="pointer-events-auto absolute inset-0 bg-ink/30 backdrop-blur-[2px] sm:hidden"
        onClick={closeAssistant}
        type="button"
      />
      <aside
        aria-label="Questora Assistant"
        aria-modal="true"
        className="pointer-events-auto absolute inset-y-0 right-0 flex w-full flex-col border-l border-border/80 bg-surface shadow-2xl sm:max-w-md"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/80 p-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <Bot aria-hidden className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold">Questora Assistant</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-moss">
                {contextLabel}
              </p>
            </div>
          </div>
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 hover:bg-surface-muted"
            onClick={closeAssistant}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
            <span className="sr-only">Close assistant</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-surface-muted p-4">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles aria-hidden className="h-4 w-4 text-moss" />
                Ask for guidance
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                I can explain, summarize, quiz you, or give hints using the current Questora page
                when context is available.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    className="rounded-lg border border-border/80 bg-surface px-3 py-2 text-left text-sm font-semibold transition hover:bg-surface-muted"
                    disabled={isSending}
                    key={prompt}
                    onClick={() => submitMessage(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <article
                  className={
                    message.role === "user"
                      ? "ml-8 rounded-xl bg-accent px-4 py-3 text-sm leading-6 text-white"
                      : "mr-8 rounded-xl border border-border/80 bg-surface-muted px-4 py-3 text-sm leading-6"
                  }
                  key={message.id}
                >
                  {(() => {
                    const sources = message.sources?.slice(0, 5) ?? [];

                    return (
                      <>
                        {message.role === "assistant" ? (
                          <div className="break-words">
                            <AIMarkdown content={message.content} />
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        )}
                        {message.role === "assistant" && sources.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {sources.map((source, index) => (
                          <span
                            className="max-w-full truncate rounded-full border border-border/80 bg-surface px-2 py-1 text-xs font-semibold text-ink/65"
                            key={`${source.label}-${source.detail ?? index}`}
                            title={source.detail}
                          >
                            {source.label}
                            {source.detail ? `: ${source.detail}` : ""}
                          </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </article>
              ))}
              {isSending ? (
                <div className="mr-8 flex items-center gap-2 rounded-xl border border-border/80 bg-surface-muted px-4 py-3 text-sm text-ink/65">
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  Generating...
                </div>
              ) : null}
              <div ref={messageEndRef} />
            </div>
          )}
          {error ? (
            <div className="mt-3 rounded-lg border border-ember/30 bg-ember/10 p-3 text-sm font-medium text-ember">
              {error}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-border/80 p-4">
          <p className="mb-3 text-xs leading-5 text-ink/55">
            I can explain, summarize, quiz, guide, and give hints. I will not complete graded work
            for you.
          </p>
          <form className="flex gap-2" onSubmit={onSubmit}>
            <textarea
              className="min-h-11 flex-1 resize-none rounded-lg border border-border/80 bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Ask about this page..."
              rows={2}
              value={draft}
            />
            <button
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!isSending && !draft.trim()}
              onClick={
                isSending
                  ? (event) => {
                      event.preventDefault();
                      stopGenerating();
                    }
                  : undefined
              }
              type={isSending ? "button" : "submit"}
            >
              {isSending ? (
                <Square aria-hidden className="h-4 w-4" />
              ) : (
                <Send aria-hidden className="h-4 w-4" />
              )}
              <span className="sr-only">{isSending ? "Stop generation" : "Send message"}</span>
            </button>
          </form>
          {messages.length > 0 ? (
            <button
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-ember"
              onClick={clearMessages}
              type="button"
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
              Clear temporary chat
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
