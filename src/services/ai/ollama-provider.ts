import { AppError } from "@/lib/errors";
import type { AIProvider, AIProviderRequest } from "@/services/ai/ai-types";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
  response?: string;
};

function stripThinkingBlocks(content: string) {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(params?: { baseUrl?: string; model?: string }) {
    this.baseUrl = params?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.model = params?.model ?? process.env.OLLAMA_MODEL ?? "qwen3:8b";
  }

  async complete(request: AIProviderRequest) {
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.3
          }
        })
      });

      if (!response.ok) {
        throw new AppError("BAD_REQUEST", "The AI assistant is unavailable right now.");
      }

      const data = (await response.json()) as OllamaChatResponse;
      const answer = data.message?.content ?? data.response;

      if (!answer?.trim()) {
        throw new AppError("BAD_REQUEST", "The AI assistant returned an empty response.");
      }

      return stripThinkingBlocks(answer);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("BAD_REQUEST", "The AI assistant is unavailable right now.");
    }
  }
}
