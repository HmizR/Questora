import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { toActionError } from "@/lib/errors";
import { createAIChatResponse } from "@/services/ai/ai-assistant-service";

function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the assistant message and try again.",
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
    const result = await createAIChatResponse(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
