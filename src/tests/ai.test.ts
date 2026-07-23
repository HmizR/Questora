import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";
import { aiChatRequestSchema } from "@/schemas/ai";
import {
  createThinkingBlockFilter,
  OllamaProvider,
  parseOllamaStreamLine,
  stripThinkingBlocks
} from "@/services/ai/ollama-provider";
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

  it("parses Ollama stream lines and ignores empty lines", () => {
    expect(parseOllamaStreamLine("")).toBeNull();
    expect(parseOllamaStreamLine("this is not json")).toBeNull();
    expect(
      parseOllamaStreamLine(JSON.stringify({ message: { content: "Hello" }, done: false }))
    ).toEqual({
      content: "Hello",
      done: false
    });
    expect(parseOllamaStreamLine(JSON.stringify({ response: "Done", done: true }))).toEqual({
      content: "Done",
      done: true
    });
  });

  it("strips thinking blocks from full and streamed content", () => {
    expect(stripThinkingBlocks("<think>private</think>\nVisible answer")).toBe("Visible answer");

    const filter = createThinkingBlockFilter();
    expect(filter.next("Visible <thi")).toBe("Visible ");
    expect(filter.next("nk>private")).toBe("");
    expect(filter.next(" reasoning</think> answer")).toBe(" answer");
    expect(filter.flush()).toBe("");
  });

  it("streams Ollama deltas and maps provider failures", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({ message: { content: "<think>hidden</think>" }, done: false })}\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({ message: { content: "Visible " }, done: false })}\n${JSON.stringify({
              message: { content: "answer" },
              done: true
            })}\n`
          )
        );
        controller.close();
      }
    });
    const fetchMock = vi.fn(async () => new Response(stream));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider({
      baseUrl: "http://ollama.test",
      model: "qwen3:8b"
    });
    const chunks: string[] = [];
    for await (const chunk of provider.stream({
      messages: [{ role: "user", content: "Help" }]
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("Visible answer");

    fetchMock.mockResolvedValueOnce(new Response("Nope", { status: 500 }));
    await expect(async () => {
      for await (const chunk of provider.stream({
        messages: [{ role: "user", content: "Help" }]
      })) {
        expect(chunk).toBeDefined();
        // Exhaust stream.
      }
    }).rejects.toBeInstanceOf(AppError);
  });
});
