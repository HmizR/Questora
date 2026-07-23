-- Enable pgvector for mission resource retrieval.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "ActivityResourceEmbeddingStatus" AS ENUM ('NOT_EMBEDDED', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "ActivityResourceText"
ADD COLUMN "embedding" vector(768),
ADD COLUMN "embeddingStatus" "ActivityResourceEmbeddingStatus" NOT NULL DEFAULT 'NOT_EMBEDDED',
ADD COLUMN "embeddedAt" TIMESTAMP(3),
ADD COLUMN "embeddingError" TEXT;

-- CreateIndex
CREATE INDEX "ActivityResourceText_embeddingStatus_idx" ON "ActivityResourceText"("embeddingStatus");

-- Vector search index for ready chunk embeddings.
CREATE INDEX "ActivityResourceText_embedding_vector_idx"
ON "ActivityResourceText"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100)
WHERE "embeddingStatus" = 'READY' AND "embedding" IS NOT NULL;
