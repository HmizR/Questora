"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { AIContextInput } from "@/schemas/ai";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ label: string; detail?: string }>;
};

type AIAssistantState = {
  isOpen: boolean;
  context: AIContextInput;
  contextLabel: string;
  messages: AssistantMessage[];
  isSending: boolean;
  error: string | null;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  registerContext: (context: AIContextInput) => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
};

const genericContext: AIContextInput = { type: "GENERIC" };
const AIAssistantContext = createContext<AIAssistantState | null>(null);

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function contextKey(context: AIContextInput) {
  return JSON.stringify(context);
}

function labelForContext(context: AIContextInput) {
  if (context.type === "STUDENT_ACTIVITY") return "Using current mission";
  if (context.type === "STUDENT_CLASS") return "Using current realm";
  return "General help";
}

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<AIContextInput>(genericContext);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerContext = useCallback((nextContext: AIContextInput) => {
    setContext((current) => {
      if (contextKey(current) === contextKey(nextContext)) {
        return current;
      }

      setMessages([]);
      setError(null);
      return nextContext;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      const userMessage: AssistantMessage = {
        id: createClientId(),
        role: "user",
        content: trimmed
      };
      const history = [...messages, userMessage].slice(-8).map((message) => ({
        role: message.role,
        content: message.content
      }));

      setMessages((current) => [...current, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            context,
            history: history.slice(0, -1)
          })
        });

        const data = (await response.json()) as {
          answer?: string;
          sources?: Array<{ label: string; detail?: string }>;
          contextLabel?: string;
          error?: { message?: string };
        };

        if (!response.ok || !data.answer) {
          throw new Error(data.error?.message ?? "The assistant could not answer right now.");
        }

        setMessages((current) => [
          ...current,
          {
            id: createClientId(),
            role: "assistant",
            content: data.answer ?? "",
            sources: data.sources
          }
        ]);
      } catch (sendError) {
        const message =
          sendError instanceof Error ? sendError.message : "The assistant could not answer right now.";
        setError(message);
      } finally {
        setIsSending(false);
      }
    },
    [context, isSending, messages]
  );

  const value = useMemo<AIAssistantState>(
    () => ({
      isOpen,
      context,
      contextLabel: labelForContext(context),
      messages,
      isSending,
      error,
      openAssistant: () => setIsOpen(true),
      closeAssistant: () => setIsOpen(false),
      toggleAssistant: () => setIsOpen((current) => !current),
      registerContext,
      sendMessage,
      clearMessages: () => {
        setMessages([]);
        setError(null);
      }
    }),
    [context, error, isOpen, isSending, messages, registerContext, sendMessage]
  );

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error("useAIAssistant must be used inside AIAssistantProvider.");
  }

  return context;
}
