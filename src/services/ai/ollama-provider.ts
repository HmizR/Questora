import { AppError } from "@/lib/errors";
import type { AIProvider, AIProviderRequest } from "@/services/ai/ai-types";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
  response?: string;
};

type OllamaStreamResponse = OllamaChatResponse & {
  done?: boolean;
};

export function stripThinkingBlocks(content: string) {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export function parseOllamaStreamLine(line: string): { content: string; done: boolean } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let data: OllamaStreamResponse;
  try {
    data = JSON.parse(trimmed) as OllamaStreamResponse;
  } catch {
    return null;
  }

  return {
    content: data.message?.content ?? data.response ?? "",
    done: data.done ?? false
  };
}

export function createThinkingBlockFilter() {
  const startTag = "<think>";
  const endTag = "</think>";
  let buffer = "";
  let isThinking = false;

  function longestTagPrefixSuffix(value: string, tag: string) {
    const lowerValue = value.toLowerCase();
    const lowerTag = tag.toLowerCase();
    const max = Math.min(lowerValue.length, lowerTag.length - 1);

    for (let length = max; length > 0; length -= 1) {
      if (lowerValue.endsWith(lowerTag.slice(0, length))) {
        return length;
      }
    }

    return 0;
  }

  return {
    next(input: string) {
      buffer += input;
      let output = "";

      while (buffer.length > 0) {
        const lowerBuffer = buffer.toLowerCase();

        if (isThinking) {
          const endIndex = lowerBuffer.indexOf(endTag);

          if (endIndex === -1) {
            const keep = longestTagPrefixSuffix(buffer, endTag);
            buffer = keep > 0 ? buffer.slice(-keep) : "";
            return output;
          }

          buffer = buffer.slice(endIndex + endTag.length);
          isThinking = false;
          continue;
        }

        const startIndex = lowerBuffer.indexOf(startTag);

        if (startIndex === -1) {
          const keep = longestTagPrefixSuffix(buffer, startTag);
          output += keep > 0 ? buffer.slice(0, -keep) : buffer;
          buffer = keep > 0 ? buffer.slice(-keep) : "";
          return output;
        }

        output += buffer.slice(0, startIndex);
        buffer = buffer.slice(startIndex + startTag.length);
        isThinking = true;
      }

      return output;
    },
    flush() {
      if (isThinking) {
        buffer = "";
        return "";
      }

      const output = buffer;
      buffer = "";
      return output;
    }
  };
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

  async *stream(request: AIProviderRequest) {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        stream: true,
        options: {
          temperature: request.temperature ?? 0.3
        }
      })
    });

    if (!response.ok || !response.body) {
      throw new AppError("BAD_REQUEST", "The AI assistant is unavailable right now.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const thinkingFilter = createThinkingBlockFilter();
    let pending = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? "";

        for (const line of lines) {
          const parsed = parseOllamaStreamLine(line);
          if (!parsed) continue;

          const content = thinkingFilter.next(parsed.content);
          if (content) yield content;
          if (parsed.done) return;
        }

        if (done) break;
      }

      if (pending.trim()) {
        const parsed = parseOllamaStreamLine(pending);
        if (parsed) {
          const content = thinkingFilter.next(parsed.content);
          if (content) yield content;
        }
      }

      const finalContent = thinkingFilter.flush();
      if (finalContent) yield finalContent;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("BAD_REQUEST", "The AI assistant is unavailable right now.");
    } finally {
      reader.releaseLock();
    }
  }
}
