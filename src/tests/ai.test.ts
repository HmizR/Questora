import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";
import { aiChatRequestSchema } from "@/schemas/ai";
import { normalizeLatexDelimiters } from "@/components/ai/ai-markdown";
import { createOllamaHeaders } from "@/services/ai/ollama-auth";
import {
  EMBEDDING_DIMENSION,
  OllamaEmbeddingProvider,
  assertEmbeddingVector,
  serializeEmbeddingVector
} from "@/services/ai/embedding-provider";
import {
  createThinkingBlockFilter,
  OllamaProvider,
  parseOllamaStreamLine,
  stripThinkingBlocks
} from "@/services/ai/ollama-provider";
import {
  academicHonestyPrompt,
  buildAcademicGuardrailInstruction,
  buildLecturerGradingAssistantSystemPrompt
} from "@/services/ai/ai-prompts";

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
    expect(academicHonestyPrompt).toContain("Disallowed help includes selecting quiz options");
  });

  it("builds strict tutoring instructions for graded missions", () => {
    const instruction = buildAcademicGuardrailInstruction({
      contextType: "STUDENT_ACTIVITY",
      activityType: "QUIZ"
    });

    expect(instruction).toContain("Tutoring mode for a graded mission");
    expect(instruction).toContain("do not complete the graded work");
    expect(instruction).toContain("do not choose options");
  });

  it("builds lighter learning guidance outside graded missions", () => {
    const lessonInstruction = buildAcademicGuardrailInstruction({
      contextType: "STUDENT_ACTIVITY",
      activityType: "LESSON"
    });
    const genericInstruction = buildAcademicGuardrailInstruction({ contextType: "GENERIC" });

    expect(lessonInstruction).toContain("General learning-assistant mode");
    expect(genericInstruction).toContain("General learning-assistant mode");
    expect(lessonInstruction).not.toContain("Tutoring mode for a graded mission");
  });

  it("builds lecturer grading assistant instructions without score suggestions", () => {
    const prompt = buildLecturerGradingAssistantSystemPrompt();

    expect(prompt).toContain("## Submission summary");
    expect(prompt).toContain("## Strengths");
    expect(prompt).toContain("## Needs improvement");
    expect(prompt).toContain("## Suggested feedback draft");
    expect(prompt).toContain("## Questions to consider");
    expect(prompt).toContain("Do not suggest, estimate, calculate, or imply a numeric score");
    expect(prompt).toContain("lecturer remains the final decision-maker");
  });

  it("normalizes common LaTeX delimiters for markdown math rendering", () => {
    expect(normalizeLatexDelimiters("Use \\(x^2 + 1\\) here.")).toBe("Use $x^2 + 1$ here.");
    expect(normalizeLatexDelimiters("Block:\n\\[a^2 + b^2 = c^2\\]")).toBe(
      "Block:\n$$\na^2 + b^2 = c^2\n$$"
    );
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

  it("adds Ollama basic auth headers when credentials are configured", async () => {
    expect(createOllamaHeaders()).toEqual({ "Content-Type": "application/json" });
    expect(createOllamaHeaders({ username: "questora", password: "secret" })).toEqual({
      "Content-Type": "application/json",
      Authorization: "Basic cXVlc3RvcmE6c2VjcmV0"
    });

    const fetchMock = vi.fn(async () =>
      Response.json({
        message: {
          content: "Authenticated response."
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider({
      baseUrl: "http://ollama.test",
      model: "qwen3:8b",
      username: "questora",
      password: "secret"
    });

    await provider.complete({
      messages: [{ role: "user", content: "Help" }]
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://ollama.test/api/chat",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Basic cXVlc3RvcmE6c2VjcmV0"
        })
      })
    );
  });

  it("validates and serializes embedding vectors", () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSION }, (_, index) => index / 1000);

    expect(assertEmbeddingVector(vector)).toBe(vector);
    expect(serializeEmbeddingVector(vector)).toBe(`[${vector.join(",")}]`);
    expect(() => assertEmbeddingVector([1, 2, 3])).toThrow(AppError);
    expect(() => assertEmbeddingVector(Array.from({ length: EMBEDDING_DIMENSION }, () => Number.NaN))).toThrow(
      AppError
    );
  });

  it("maps Ollama embedding responses and rejects wrong dimensions", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSION }, () => 0.25);
    const fetchMock = vi.fn(async () =>
      Response.json({
        embeddings: [vector]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaEmbeddingProvider({
      baseUrl: "http://ollama.test",
      model: "nomic-embed-text",
      username: "questora",
      password: "secret"
    });

    await expect(provider.embed("resource excerpt")).resolves.toEqual(vector);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://ollama.test/api/embed",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Basic cXVlc3RvcmE6c2VjcmV0"
        }),
        body: JSON.stringify({
          model: "nomic-embed-text",
          input: "resource excerpt"
        })
      })
    );

    fetchMock.mockResolvedValueOnce(Response.json({ embeddings: [[1, 2, 3]] }));
    await expect(provider.embed("bad vector")).rejects.toBeInstanceOf(AppError);
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
