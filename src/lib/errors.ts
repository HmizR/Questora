export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppErrorShape };

export type AppErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "BAD_REQUEST";

export type AppErrorShape = {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function toActionError(error: unknown): AppErrorShape {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }

  return {
    code: "BAD_REQUEST",
    message: "Something went wrong. Please try again."
  };
}
