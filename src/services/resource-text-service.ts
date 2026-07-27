import "server-only";

import { ActivityResourceTextStatus, type ActivityResource } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  chunkPagesWithPageLocations,
  chunkTextWithLineLocations,
  getResourceExtractability,
  type ExtractedTextChunk
} from "@/lib/resource-text-rules";
import { parseStorageRef, downloadStorageObject } from "@/lib/storage";
import { isProtectedStorageRef } from "@/lib/upload-rules";
import {
  clearActivityResourceEmbeddings,
  embedActivityResourceTextChunks
} from "@/services/ai/resource-retrieval-service";

const MAX_SAFE_ERROR_LENGTH = 180;
type PdfParseWithOptions = (
  buffer: Buffer,
  options?: {
    pagerender?: (pageData: {
      getTextContent: (options: {
        normalizeWhitespace: boolean;
        disableCombineTextItems: boolean;
      }) => Promise<{ items: Array<{ str?: string }> }>;
    }) => Promise<string>;
  }
) => Promise<{ text: string }>;

export async function extractTextFromResource(resource: ActivityResource) {
  const extractability = getResourceExtractability(resource);

  if (!isProtectedStorageRef(resource.fileUrl)) {
    await markExtractionStatus(resource.id, ActivityResourceTextStatus.UNSUPPORTED);
    return;
  }

  if (extractability === "UNSUPPORTED") {
    await markExtractionStatus(resource.id, ActivityResourceTextStatus.UNSUPPORTED);
    return;
  }

  try {
    const objectBuffer = await downloadStorageObject(parseStorageRef(resource.fileUrl));
    const chunks = await extractTextChunksFromBuffer({
      buffer: objectBuffer,
      contentType: resource.contentType,
      fileName: resource.fileName
    });

    if (chunks.length === 0) {
      await markExtractionStatus(
        resource.id,
        ActivityResourceTextStatus.FAILED,
        "No readable text could be extracted."
      );
      return;
    }

    await db.$transaction([
      db.activityResourceText.deleteMany({ where: { resourceId: resource.id } }),
      db.activityResource.update({
        where: { id: resource.id },
        data: {
          textStatus: ActivityResourceTextStatus.READY,
          textExtractedAt: new Date(),
          textError: null
        }
      }),
      db.activityResourceText.createMany({
        data: chunks.map((content, index) => ({
          resourceId: resource.id,
          chunkIndex: index,
          content: content.content,
          pageStart: content.pageStart,
          pageEnd: content.pageEnd,
          lineStart: content.lineStart,
          lineEnd: content.lineEnd
        }))
      })
    ]);
  } catch (error) {
    await markExtractionStatus(
      resource.id,
      ActivityResourceTextStatus.FAILED,
      safeExtractionError(error)
    );
    return;
  }

  try {
    await embedActivityResourceTextChunks(resource.id);
  } catch {
    // Embeddings are a search enhancement; failed embedding setup must not undo extraction.
  }
}

export async function extractTextChunksFromProtectedFile(input: {
  fileUrl: string | null | undefined;
  fileName?: string | null;
  contentType?: string | null;
}) {
  if (!input.fileUrl || !isProtectedStorageRef(input.fileUrl)) {
    return { status: "UNSUPPORTED" as const, chunks: [] };
  }

  const key = parseStorageRef(input.fileUrl);
  const fileName = input.fileName?.trim() || fileNameFromStorageKey(key);
  const extractability = getResourceExtractability({
    contentType: input.contentType,
    fileName
  });

  if (extractability === "UNSUPPORTED") {
    return { status: "UNSUPPORTED" as const, chunks: [] };
  }

  const objectBuffer = await downloadStorageObject(key);
  const chunks = await extractTextChunksFromBuffer({
    buffer: objectBuffer,
    contentType: input.contentType,
    fileName
  });

  return {
    status: chunks.length > 0 ? ("READY" as const) : ("FAILED" as const),
    chunks
  };
}

export async function retryActivityResourceExtraction(input: {
  lecturerId: string;
  activityId: string;
  resourceId: string;
}) {
  const resource = await getLecturerResource(input);

  await extractTextFromResource(resource);
}

export async function clearActivityResourceExtraction(input: {
  lecturerId: string;
  activityId: string;
  resourceId: string;
}) {
  await getLecturerResource(input);
  await markExtractionStatus(input.resourceId, ActivityResourceTextStatus.NOT_EXTRACTED);
}

export async function retryActivityResourceEmbeddings(input: {
  lecturerId: string;
  activityId: string;
  resourceId: string;
}) {
  await getLecturerResource(input);
  await embedActivityResourceTextChunks(input.resourceId);
}

export async function clearActivityResourceEmbeddingState(input: {
  lecturerId: string;
  activityId: string;
  resourceId: string;
}) {
  await getLecturerResource(input);
  await clearActivityResourceEmbeddings(input.resourceId);
}

async function getLecturerResource(input: {
  lecturerId: string;
  activityId: string;
  resourceId: string;
}) {
  const resource = await db.activityResource.findFirst({
    where: {
      id: input.resourceId,
      activityId: input.activityId,
      activity: {
        module: {
          class: {
            lecturerId: input.lecturerId
          }
        }
      }
    }
  });

  if (!resource) {
    throw new AppError("NOT_FOUND", "Resource not found.");
  }

  return resource;
}

async function extractTextChunksFromBuffer(input: {
  buffer: Buffer;
  contentType?: string | null;
  fileName: string;
}): Promise<ExtractedTextChunk[]> {
  const extractability = getResourceExtractability({
    contentType: input.contentType,
    fileName: input.fileName
  });

  if (extractability === "UNSUPPORTED") {
    return [];
  }

  return extractability === "PDF"
    ? extractPdfChunks(input.buffer)
    : chunkTextWithLineLocations(input.buffer.toString("utf8"));
}

async function extractPdfChunks(buffer: Buffer) {
  const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
  const parsePdfWithOptions = pdfParse as PdfParseWithOptions;
  const pages: Array<{ pageNumber: number; text: string }> = [];
  let pageNumber = 0;

  await parsePdfWithOptions(buffer, {
    pagerender: async (pageData) => {
      pageNumber += 1;
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false
      });
      const text = textContent.items
        .map((item) => item.str ?? "")
        .join(" ");
      pages.push({ pageNumber, text });
      return text;
    }
  });

  return chunkPagesWithPageLocations(pages);
}

function fileNameFromStorageKey(key: string) {
  const keyPart = key.split("/").pop() ?? "submission";
  return keyPart.replace(/^[0-9a-f-]{12,}-/i, "") || keyPart;
}

async function markExtractionStatus(
  resourceId: string,
  status: ActivityResourceTextStatus,
  error?: string
) {
  await db.$transaction([
    db.activityResourceText.deleteMany({ where: { resourceId } }),
    db.activityResource.update({
      where: { id: resourceId },
      data: {
        textStatus: status,
        textExtractedAt: status === ActivityResourceTextStatus.READY ? new Date() : null,
        textError: error ?? null
      }
    })
  ]);
}

function safeExtractionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Text extraction failed.";
  return message.replace(/\s+/g, " ").slice(0, MAX_SAFE_ERROR_LENGTH);
}
