import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { authorizeUploadIntent } from "@/app/api/uploads/authorization";
import { AppError, toActionError } from "@/lib/errors";
import {
  createPresignedUploadUrl,
  createStorageKey,
  presignUploadSchema,
  STORAGE_URL_EXPIRES_IN,
  toStorageRef,
  validateUploadFile
} from "@/lib/storage";

function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the upload fields and try again.",
          fieldErrors: error.flatten().fieldErrors
        }
      },
      { status: 400 }
    );
  }

  const actionError = toActionError(error);
  const status =
    actionError.code === "AUTHENTICATION_REQUIRED"
      ? 401
      : actionError.code === "FORBIDDEN"
        ? 403
        : actionError.code === "NOT_FOUND"
          ? 404
          : 400;

  return NextResponse.json({ error: actionError }, { status });
}

export async function POST(request: Request) {
  try {
    const parsed = presignUploadSchema.parse(await request.json());
    validateUploadFile(parsed);

    const authorization = await authorizeUploadIntent({
      intent: parsed.intent,
      activityId: parsed.activityId
    });
    const key = createStorageKey({
      intent: parsed.intent,
      fileName: parsed.fileName,
      userId: authorization.keyUserId,
      activityId: parsed.activityId
    });
    const storageRef = toStorageRef(key);
    const uploadUrl = await createPresignedUploadUrl({
      key,
      contentType: parsed.contentType,
      size: parsed.size
    });

    return NextResponse.json({
      uploadUrl,
      storageRef,
      key,
      expiresIn: STORAGE_URL_EXPIRES_IN
    });
  } catch (error) {
    if (error instanceof AppError || error instanceof ZodError) {
      return jsonError(error);
    }

    return jsonError(error);
  }
}
