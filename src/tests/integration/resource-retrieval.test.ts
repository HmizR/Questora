import {
  ActivityResourceEmbeddingStatus,
  ActivityResourceKind,
  ActivityResourceTextStatus,
  ActivityType
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { EMBEDDING_DIMENSION, type EmbeddingProvider } from "@/services/ai/embedding-provider";
import {
  backfillPendingResourceEmbeddings,
  embedActivityResourceTextChunks,
  retrieveRelevantActivityResourceChunks
} from "@/services/ai/resource-retrieval-service";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture
} from "./fixtures";

function vectorFor(text: string) {
  return Array.from({ length: EMBEDDING_DIMENSION }, (_, index) => {
    if (index === 0) return text.toLowerCase().includes("photosynthesis") ? 1 : 0;
    if (index === 1) return text.toLowerCase().includes("graph") ? 1 : 0;
    return 0;
  });
}

const testEmbeddingProvider: EmbeddingProvider = {
  async embed(text: string) {
    return vectorFor(text);
  }
};

async function createExtractedResource(params: {
  activityId: string;
  lecturerId: string;
  title: string;
  content: string;
  isRequired?: boolean;
  position?: number;
}) {
  return db.activityResource.create({
    data: {
      activityId: params.activityId,
      title: params.title,
      description: `${params.title} description`,
      kind: ActivityResourceKind.READING,
      isRequired: params.isRequired ?? false,
      fileName: `${params.title.toLowerCase().replace(/\s+/g, "-")}.txt`,
      fileUrl: `s3:mission-resources/${params.activityId}/${params.title}.txt`,
      contentType: "text/plain",
      size: params.content.length,
      position: params.position ?? 1,
      createdById: params.lecturerId,
      textStatus: ActivityResourceTextStatus.READY,
      textExtractedAt: new Date(),
      extractedTexts: {
        create: {
          chunkIndex: 0,
          content: params.content
        }
      }
    },
    include: { extractedTexts: true }
  });
}

describe("resource semantic retrieval services", () => {
  it("embeds extracted chunks and retrieves only relevant activity chunks", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    const otherActivity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      position: 2,
      title: "Other Mission"
    });
    const requiredResource = await createExtractedResource({
      activityId: activity.id,
      lecturerId: lecturer.id,
      title: "Required Photosynthesis Guide",
      content: "Photosynthesis turns light into chemical energy.",
      isRequired: true
    });
    const optionalResource = await createExtractedResource({
      activityId: activity.id,
      lecturerId: lecturer.id,
      title: "Optional Graph Guide",
      content: "Graph your observations in a table.",
      position: 2
    });
    const otherResource = await createExtractedResource({
      activityId: otherActivity.id,
      lecturerId: lecturer.id,
      title: "Other Photosynthesis Notes",
      content: "Photosynthesis notes from another mission."
    });

    await embedActivityResourceTextChunks(requiredResource.id, testEmbeddingProvider);
    await embedActivityResourceTextChunks(optionalResource.id, testEmbeddingProvider);
    await embedActivityResourceTextChunks(otherResource.id, testEmbeddingProvider);

    const chunks = await retrieveRelevantActivityResourceChunks({
      activityId: activity.id,
      query: "Explain photosynthesis",
      provider: testEmbeddingProvider,
      limit: 5
    });

    expect(chunks[0]?.resourceTitle).toBe("Required Photosynthesis Guide");
    expect(chunks.map((chunk) => chunk.resourceTitle)).not.toContain("Other Photosynthesis Notes");
  });

  it("backfills pending extracted chunks", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    const resource = await createExtractedResource({
      activityId: activity.id,
      lecturerId: lecturer.id,
      title: "Backfill Guide",
      content: "Photosynthesis backfill content."
    });

    const result = await backfillPendingResourceEmbeddings(testEmbeddingProvider);
    const chunk = await db.activityResourceText.findFirstOrThrow({
      where: { resourceId: resource.id }
    });

    expect(result.resourcesProcessed).toBe(1);
    expect(chunk.embeddingStatus).toBe(ActivityResourceEmbeddingStatus.READY);
    expect(chunk.embeddedAt).toBeInstanceOf(Date);
    expect(chunk.embeddingError).toBeNull();
  });
});
