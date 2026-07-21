"use client";

import { useEffect } from "react";

import { useAIAssistant } from "@/components/ai/ai-assistant-provider";
import type { AIContextInput } from "@/schemas/ai";

export function AIAssistantContextRegistration({ context }: { context: AIContextInput }) {
  const { registerContext } = useAIAssistant();

  useEffect(() => {
    registerContext(context);
  }, [context, registerContext]);

  return null;
}
