import { AppError } from "@/lib/errors";
import { aiChatRequestSchema, type AIChatRequestInput } from "@/schemas/ai";
import { buildAIContext } from "@/services/ai/ai-context-service";
import { getAIProvider } from "@/services/ai/ai-provider";
import type { AIChatResponse, AIProvider } from "@/services/ai/ai-types";
import { limitRecentMessages } from "@/services/ai/ai-types";

export async function createAIChatResponse(
  rawInput: unknown,
  provider: AIProvider = getAIProvider()
): Promise<AIChatResponse> {
  const input: AIChatRequestInput = aiChatRequestSchema.parse(rawInput);
  const context = await buildAIContext(input.context);
  const recentMessages = limitRecentMessages(input.history);

  const answer = await provider.complete({
    temperature: 0.25,
    messages: [
      { role: "system", content: context.systemPrompt },
      {
        role: "user",
        content: `Authorized Questora context:\n${context.contextText}`
      },
      ...recentMessages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      { role: "user", content: input.message }
    ]
  });

  if (!answer.trim()) {
    throw new AppError("BAD_REQUEST", "The AI assistant returned an empty response.");
  }

  return {
    answer,
    sources: context.sources.slice(0, 8),
    contextLabel: context.label
  };
}
