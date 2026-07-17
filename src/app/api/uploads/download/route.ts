import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { authorizeStorageRef } from "@/app/api/uploads/authorization";
import { toActionError } from "@/lib/errors";
import {
  createPresignedDownloadUrl,
  parseStorageRef,
  presignDownloadSchema,
  STORAGE_URL_EXPIRES_IN
} from "@/lib/storage";

function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the download fields and try again.",
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
    const parsed = presignDownloadSchema.parse(await request.json());
    const key = parseStorageRef(parsed.storageRef);

    await authorizeStorageRef({
      intent: parsed.intent,
      key,
      activityId: parsed.activityId
    });

    const downloadUrl = await createPresignedDownloadUrl(key);

    return NextResponse.json({
      downloadUrl,
      expiresIn: STORAGE_URL_EXPIRES_IN
    });
  } catch (error) {
    return jsonError(error);
  }
}
