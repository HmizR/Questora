import { AppError } from "@/lib/errors";
import { createOllamaHeaders, type OllamaAuthParams } from "@/services/ai/ollama-auth";

export const EMBEDDING_DIMENSION = 768;

export type EmbeddingProvider = {
  embed(text: string): Promise<number[]>;
};

type OllamaEmbedResponse = {
  embeddings?: number[][];
  embedding?: number[];
};

export function assertEmbeddingVector(value: number[]) {
  if (value.length !== EMBEDDING_DIMENSION) {
    throw new AppError("BAD_REQUEST", "The embedding provider returned an unexpected vector size.");
  }

  if (!value.every((item) => Number.isFinite(item))) {
    throw new AppError("BAD_REQUEST", "The embedding provider returned an invalid vector.");
  }

  return value;
}

export function serializeEmbeddingVector(value: number[]) {
  assertEmbeddingVector(value);
  return `[${value.join(",")}]`;
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly auth?: OllamaAuthParams;

  constructor(params?: { baseUrl?: string; model?: string } & OllamaAuthParams) {
    this.baseUrl = params?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.model = params?.model ?? process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text";
    this.auth = {
      username: params?.username,
      password: params?.password
    };
  }

  async embed(text: string) {
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/embed`, {
        method: "POST",
        headers: createOllamaHeaders(this.auth),
        body: JSON.stringify({
          model: this.model,
          input: text
        })
      });

      if (!response.ok) {
        throw new AppError("BAD_REQUEST", "The embedding provider is unavailable right now.");
      }

      const data = (await response.json()) as OllamaEmbedResponse;
      const embedding = data.embeddings?.[0] ?? data.embedding;

      if (!embedding) {
        throw new AppError("BAD_REQUEST", "The embedding provider returned an empty vector.");
      }

      return assertEmbeddingVector(embedding);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("BAD_REQUEST", "The embedding provider is unavailable right now.");
    }
  }
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER ?? "ollama";

  if (provider === "ollama") {
    return new OllamaEmbeddingProvider();
  }

  throw new AppError("BAD_REQUEST", "The configured embedding provider is not supported.");
}
