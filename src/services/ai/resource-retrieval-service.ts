import "server-only";

import { ActivityResourceEmbeddingStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isSuspiciousExtractedText, sanitizeExtractedText } from "@/lib/resource-text-rules";
import {
  getEmbeddingProvider,
  serializeEmbeddingVector,
  type EmbeddingProvider
} from "@/services/ai/embedding-provider";

const MAX_SAFE_ERROR_LENGTH = 180;
export const RESOURCE_RAG_TOP_K = 5;

export type RetrievedResourceChunk = {
  id: string;
  resourceId: string;
  resourceTitle: string;
  isRequired: boolean;
  chunkIndex: number;
  content: string;
  distance: number;
};

function safeEmbeddingError(error: unknown) {
  const message = error instanceof Error ? error.message : "Embedding failed.";
  return message.replace(/\s+/g, " ").slice(0, MAX_SAFE_ERROR_LENGTH);
}

async function markChunkEmbeddingFailed(chunkId: string, error: unknown) {
  await db.activityResourceText.update({
    where: { id: chunkId },
    data: {
      embeddingStatus: ActivityResourceEmbeddingStatus.FAILED,
      embeddedAt: null,
      embeddingError: safeEmbeddingError(error)
    }
  });
}

export async function embedActivityResourceTextChunks(
  resourceId: string,
  provider: EmbeddingProvider = getEmbeddingProvider()
) {
  const chunks = await db.activityResourceText.findMany({
    where: { resourceId },
    orderBy: { chunkIndex: "asc" }
  });

  for (const chunk of chunks) {
    try {
      if (isSuspiciousExtractedText(chunk.content)) {
        throw new AppError("BAD_REQUEST", "Chunk text was not readable enough for embeddings.");
      }

      const embedding = await provider.embed(sanitizeExtractedText(chunk.content));
      await db.$executeRawUnsafe(
        `UPDATE "ActivityResourceText"
         SET "embedding" = $1::vector,
             "embeddingStatus" = 'READY',
             "embeddedAt" = NOW(),
             "embeddingError" = NULL
         WHERE "id" = $2`,
        serializeEmbeddingVector(embedding),
        chunk.id
      );
    } catch (error) {
      await markChunkEmbeddingFailed(chunk.id, error);
    }
  }
}

export async function clearActivityResourceEmbeddings(resourceId: string) {
  await db.$executeRawUnsafe(
    `UPDATE "ActivityResourceText"
     SET "embedding" = NULL,
         "embeddingStatus" = 'NOT_EMBEDDED',
         "embeddedAt" = NULL,
         "embeddingError" = NULL
     WHERE "resourceId" = $1`,
    resourceId
  );
}

export async function backfillPendingResourceEmbeddings(provider = getEmbeddingProvider()) {
  const resourceIds = await db.activityResourceText.findMany({
    where: {
      resource: { textStatus: "READY" },
      embeddingStatus: { not: ActivityResourceEmbeddingStatus.READY }
    },
    distinct: ["resourceId"],
    select: { resourceId: true }
  });

  for (const item of resourceIds) {
    await embedActivityResourceTextChunks(item.resourceId, provider);
  }

  return { resourcesProcessed: resourceIds.length };
}

export async function retrieveRelevantActivityResourceChunks(params: {
  activityId: string;
  query: string;
  provider?: EmbeddingProvider;
  limit?: number;
}) {
  const provider = params.provider ?? getEmbeddingProvider();
  const queryEmbedding = serializeEmbeddingVector(await provider.embed(params.query));
  const limit = params.limit ?? RESOURCE_RAG_TOP_K;

  return db.$queryRawUnsafe<RetrievedResourceChunk[]>(
    `SELECT
       art."id",
       art."resourceId",
       ar."title" AS "resourceTitle",
       ar."isRequired",
       art."chunkIndex",
       art."content",
       (art."embedding" <=> $1::vector) AS "distance"
     FROM "ActivityResourceText" art
     INNER JOIN "ActivityResource" ar ON ar."id" = art."resourceId"
     WHERE ar."activityId" = $2
       AND art."embeddingStatus" = 'READY'
       AND art."embedding" IS NOT NULL
     ORDER BY ((art."embedding" <=> $1::vector) - CASE WHEN ar."isRequired" THEN 0.03 ELSE 0 END) ASC
     LIMIT $3`,
    queryEmbedding,
    params.activityId,
    limit
  );
}
