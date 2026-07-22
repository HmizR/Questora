import { ZodError } from "zod";

import { toActionError } from "@/lib/errors";
import { createAIChatStream } from "@/services/ai/ai-assistant-service";

const encoder = new TextEncoder();

function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
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

  return Response.json({ error: actionError }, { status });
}

export async function POST(request: Request) {
  let result: Awaited<ReturnType<typeof createAIChatStream>>;

  try {
    result = await createAIChatStream(await request.json());
  } catch (error) {
    return jsonError(error);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        sse("meta", {
          sources: result.sources,
          contextLabel: result.contextLabel
        })
      );

      try {
        for await (const content of result.stream) {
          controller.enqueue(sse("delta", { content }));
        }

        controller.enqueue(sse("done", {}));
      } catch {
        controller.enqueue(
          sse("error", {
            message: "The AI assistant is unavailable right now."
          })
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no"
    }
  });
}
