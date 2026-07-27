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
  retrieveRelevantClassResourceChunks,
  retrieveRelevantActivityResourceChunks
} from "@/services/ai/resource-retrieval-service";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  enrollStudentFixture
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
  pageStart?: number;
  pageEnd?: number;
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
          content: params.content,
          pageStart: params.pageStart,
          pageEnd: params.pageEnd
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
      isRequired: true,
      pageStart: 12,
      pageEnd: 13
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
    expect(chunks[0]).toMatchObject({ pageStart: 12, pageEnd: 13 });
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

  it("retrieves relevant class chunks only from enrolled published content", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id, {
      title: "Visible Region"
    });
    const publishedActivity = await createActivityFixture(learningModule.id, {
      title: "Visible Photosynthesis Mission"
    });
    const unpublishedActivity = await createActivityFixture(learningModule.id, {
      title: "Draft Photosynthesis Mission",
      isPublished: false,
      position: 2
    });
    const hiddenModule = await createModuleFixture(teachingClass.id, {
      title: "Hidden Region",
      isPublished: false,
      position: 2
    });
    const hiddenModuleActivity = await createActivityFixture(hiddenModule.id, {
      title: "Hidden Photosynthesis Mission"
    });
    const otherClass = await createClassFixture({ name: "Other Realm" });
    const otherModule = await createModuleFixture(otherClass.class.id);
    const otherActivity = await createActivityFixture(otherModule.id, {
      title: "Other Photosynthesis Mission"
    });

    const visibleResource = await createExtractedResource({
      activityId: publishedActivity.id,
      lecturerId: lecturer.id,
      title: "Class Photosynthesis Guide",
      content: "Photosynthesis class-wide context for enrolled students.",
      isRequired: true,
      pageStart: 5,
      pageEnd: 5
    });
    const unpublishedActivityResource = await createExtractedResource({
      activityId: unpublishedActivity.id,
      lecturerId: lecturer.id,
      title: "Draft Activity Notes",
      content: "Photosynthesis draft activity notes."
    });
    const hiddenModuleResource = await createExtractedResource({
      activityId: hiddenModuleActivity.id,
      lecturerId: lecturer.id,
      title: "Hidden Module Notes",
      content: "Photosynthesis hidden module notes."
    });
    const otherClassResource = await createExtractedResource({
      activityId: otherActivity.id,
      lecturerId: otherClass.lecturer.id,
      title: "Other Class Notes",
      content: "Photosynthesis other class notes."
    });

    await embedActivityResourceTextChunks(visibleResource.id, testEmbeddingProvider);
    await embedActivityResourceTextChunks(unpublishedActivityResource.id, testEmbeddingProvider);
    await embedActivityResourceTextChunks(hiddenModuleResource.id, testEmbeddingProvider);
    await embedActivityResourceTextChunks(otherClassResource.id, testEmbeddingProvider);

    const chunks = await retrieveRelevantClassResourceChunks({
      classId: teachingClass.id,
      studentId: student.id,
      query: "Explain photosynthesis",
      provider: testEmbeddingProvider,
      limit: 8
    });

    expect(chunks.map((chunk) => chunk.resourceTitle)).toEqual(["Class Photosynthesis Guide"]);
    expect(chunks[0]).toMatchObject({
      activityTitle: "Visible Photosynthesis Mission",
      moduleTitle: "Visible Region",
      pageStart: 5,
      pageEnd: 5
    });
  });
});
