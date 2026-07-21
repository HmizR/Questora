import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";
import { aiChatRequestSchema } from "@/schemas/ai";
import { OllamaProvider } from "@/services/ai/ollama-provider";
import { academicHonestyPrompt } from "@/services/ai/ai-prompts";

describe("AI assistant helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates chat requests and context payloads", () => {
    expect(() =>
      aiChatRequestSchema.parse({
        message: "Explain this",
        context: { type: "STUDENT_ACTIVITY", classId: "not-a-cuid", activityId: "also-bad" }
      })
    ).toThrow();

    expect(() =>
      aiChatRequestSchema.parse({
        message: "",
        context: { type: "GENERIC" }
      })
    ).toThrow();

    expect(
      aiChatRequestSchema.parse({
        message: "Explain this",
        context: { type: "GENERIC" },
        history: [{ role: "assistant", content: "Previous answer" }]
      }).message
    ).toBe("Explain this");
  });

  it("includes academic honesty guardrails", () => {
    expect(academicHonestyPrompt).toContain("Do not complete graded assignments");
    expect(academicHonestyPrompt).toContain("Give hints");
    expect(academicHonestyPrompt).toContain("Only use the provided context");
  });

  it("maps Ollama success and failure responses", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        message: {
          content: "<think>private reasoning</think>\nUse the mission instructions first."
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider({
      baseUrl: "http://ollama.test",
      model: "qwen3:8b"
    });

    await expect(
      provider.complete({
        messages: [{ role: "user", content: "Help" }]
      })
    ).resolves.toBe("Use the mission instructions first.");

    fetchMock.mockResolvedValueOnce(new Response("Nope", { status: 500 }));
    await expect(
      provider.complete({
        messages: [{ role: "user", content: "Help" }]
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
