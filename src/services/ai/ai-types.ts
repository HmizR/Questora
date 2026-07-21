import type { AIChatMessageInput } from "@/schemas/ai";

export type AISource = {
  label: string;
  detail?: string;
};

export type AIProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIProviderRequest = {
  messages: AIProviderMessage[];
  temperature?: number;
};

export type AIProvider = {
  complete(request: AIProviderRequest): Promise<string>;
};

export type AIContextResult = {
  label: string;
  systemPrompt: string;
  contextText: string;
  sources: AISource[];
};

export type AIChatResponse = {
  answer: string;
  sources: AISource[];
  contextLabel: string;
};

export function limitRecentMessages(history: AIChatMessageInput[]) {
  return history.slice(-6);
}
