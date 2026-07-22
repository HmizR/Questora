import "server-only";

import { ActivityResourceTextStatus, type ActivityResource } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  chunkExtractedText,
  getResourceExtractability
} from "@/lib/resource-text-rules";
import { parseStorageRef, downloadStorageObject } from "@/lib/storage";
import { isProtectedStorageRef } from "@/lib/upload-rules";

const MAX_SAFE_ERROR_LENGTH = 180;

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
    const rawText =
      extractability === "PDF"
        ? await extractPdfText(objectBuffer)
        : objectBuffer.toString("utf8");
    const chunks = chunkExtractedText(rawText);

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
          content
        }))
      })
    ]);
  } catch (error) {
    await markExtractionStatus(
      resource.id,
      ActivityResourceTextStatus.FAILED,
      safeExtractionError(error)
    );
  }
}

export async function retryActivityResourceExtraction(input: {
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

  await extractTextFromResource(resource);
}

async function extractPdfText(buffer: Buffer) {
  const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
  const parsed = await pdfParse(buffer);
  return parsed.text;
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
