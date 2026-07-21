import { AppError } from "@/lib/errors";
import type { AIProvider } from "@/services/ai/ai-types";
import { OllamaProvider } from "@/services/ai/ollama-provider";

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "ollama";

  if (provider === "ollama") {
    return new OllamaProvider();
  }

  throw new AppError("BAD_REQUEST", "The configured AI provider is not supported.");
}
