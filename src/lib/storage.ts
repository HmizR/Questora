import { randomUUID } from "node:crypto";

import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import {
  isAllowedUploadSize,
  isAllowedUploadType,
  type UploadIntent
} from "@/lib/upload-rules";

export type { UploadIntent } from "@/lib/upload-rules";

export const STORAGE_URL_EXPIRES_IN = 300;

export const uploadIntentSchema = z.enum(["AVATAR", "SUBMISSION", "MISSION_RESOURCE"]);

const baseUploadSchema = z.object({
  intent: uploadIntentSchema,
  fileName: z.string().trim().min(1, "File name is required").max(180),
  contentType: z.string().trim().min(1, "Content type is required").max(120),
  size: z.coerce.number().int().positive("File size is required"),
  activityId: z.string().trim().min(1).optional()
});

export const presignUploadSchema = baseUploadSchema.superRefine((data, context) => {
  if ((data.intent === "SUBMISSION" || data.intent === "MISSION_RESOURCE") && !data.activityId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Activity is required for this upload.",
      path: ["activityId"]
    });
  }
});

export const presignDownloadSchema = z.object({
  intent: uploadIntentSchema,
  storageRef: z.string().trim().min(1),
  activityId: z.string().trim().min(1).optional()
});

export function validateUploadFile(input: {
  intent: UploadIntent;
  contentType: string;
  size: number;
}) {
  if (!isAllowedUploadType(input.intent, input.contentType)) {
    throw new AppError("VALIDATION_ERROR", "This file type is not allowed for that upload.");
  }

  if (!isAllowedUploadSize(input.intent, input.size)) {
    throw new AppError("VALIDATION_ERROR", "This file is larger than the allowed upload limit.");
  }
}

export function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const withoutPath = normalized.split(/[\\/]/).pop() ?? "";
  const safeName = withoutPath.replace(/^\.+/, "");

  return safeName.length > 0 ? safeName.slice(0, 120) : "upload";
}

export function createStorageKey(input: {
  intent: UploadIntent;
  fileName: string;
  userId: string;
  activityId?: string;
}) {
  const safeName = sanitizeFileName(input.fileName);
  const id = randomUUID();

  if (input.intent === "AVATAR") {
    return `avatars/${input.userId}/${id}-${safeName}`;
  }

  if (!input.activityId) {
    throw new AppError("VALIDATION_ERROR", "Activity is required for this upload.");
  }

  if (input.intent === "SUBMISSION") {
    return `submissions/${input.activityId}/${input.userId}/${id}-${safeName}`;
  }

  return `mission-resources/${input.activityId}/${id}-${safeName}`;
}

export function toStorageRef(key: string) {
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    throw new AppError("VALIDATION_ERROR", "Invalid storage object key.");
  }

  return `s3:${key}`;
}

export function parseStorageRef(storageRef: string) {
  if (!storageRef.startsWith("s3:")) {
    throw new AppError("VALIDATION_ERROR", "Invalid storage reference.");
  }

  const key = storageRef.slice(3);
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    throw new AppError("VALIDATION_ERROR", "Invalid storage reference.");
  }

  return key;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new AppError("BAD_REQUEST", `${name} is not configured.`);
  }

  return value;
}

function storageConfig() {
  return {
    bucket: requiredEnv("S3_BUCKET"),
    region: requiredEnv("S3_REGION"),
    accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
  };
}

function createS3Client() {
  const config = storageConfig();

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

export async function createPresignedUploadUrl(input: {
  key: string;
  contentType: string;
  size: number;
}) {
  const config = storageConfig();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.size
  });

  return getSignedUrl(createS3Client(), command, { expiresIn: STORAGE_URL_EXPIRES_IN });
}

export async function createPresignedDownloadUrl(key: string) {
  const config = storageConfig();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key
  });

  return getSignedUrl(createS3Client(), command, { expiresIn: STORAGE_URL_EXPIRES_IN });
}
