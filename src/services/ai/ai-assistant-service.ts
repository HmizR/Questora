import { AppError } from "@/lib/errors";
import { aiChatRequestSchema, type AIChatRequestInput } from "@/schemas/ai";
import { buildAIContext } from "@/services/ai/ai-context-service";
import { getAIProvider } from "@/services/ai/ai-provider";
import { buildAcademicGuardrailInstruction } from "@/services/ai/ai-prompts";
import type {
  AIChatResponse,
  AIContextResult,
  AIProvider,
  AIProviderRequest
} from "@/services/ai/ai-types";
import { limitRecentMessages } from "@/services/ai/ai-types";

async function buildAIChatRequest(rawInput: unknown): Promise<{
  context: AIContextResult;
  providerRequest: AIProviderRequest;
}> {
  const input: AIChatRequestInput = aiChatRequestSchema.parse(rawInput);
  const context = await buildAIContext(input.context, { query: input.message });
  const recentMessages = limitRecentMessages(input.history);
  const guardrailInstruction = buildAcademicGuardrailInstruction(context);

  return {
    context,
    providerRequest: {
      temperature: 0.25,
      messages: [
        { role: "system", content: context.systemPrompt },
        { role: "system", content: guardrailInstruction },
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
    }
  };
}

export async function createAIChatResponse(
  rawInput: unknown,
  provider: AIProvider = getAIProvider()
): Promise<AIChatResponse> {
  const { context, providerRequest } = await buildAIChatRequest(rawInput);
  const answer = await provider.complete(providerRequest);

  if (!answer.trim()) {
    throw new AppError("BAD_REQUEST", "The AI assistant returned an empty response.");
  }

  return {
    answer,
    sources: context.sources.slice(0, 8),
    contextLabel: context.label
  };
}

export async function createAIChatStream(
  rawInput: unknown,
  provider: AIProvider = getAIProvider()
): Promise<{
  contextLabel: string;
  sources: AIContextResult["sources"];
  stream: AsyncIterable<string>;
}> {
  const { context, providerRequest } = await buildAIChatRequest(rawInput);
  const stream =
    provider.stream?.(providerRequest) ??
    (async function* fallbackStream() {
      yield await provider.complete(providerRequest);
    })();

  return {
    contextLabel: context.label,
    sources: context.sources.slice(0, 8),
    stream
  };
}
