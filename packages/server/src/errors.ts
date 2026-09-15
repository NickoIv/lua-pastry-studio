import { isApiErrorCode, type ApiErrorCode } from "@lua/types";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
    this.name = "AppError";
  }
}

const STATUS_BY_CODE: Partial<Record<ApiErrorCode, number>> = {
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  ORDER_NOT_FOUND: 404,
  REDEMPTION_NOT_FOUND: 404,
  REWARD_NOT_FOUND: 404,
  VALIDATION: 422,
  INTERNAL: 500,
};

/**
 * Translates a raw pg driver error into an AppError with a known code.
 * A Postgres function in infra/db/migrations raises exceptions whose
 * message is exactly one of packages/types' ApiErrorCode values — that
 * message is trusted here (nothing else reaches this path with a bare
 * matching string) and never leaks any other raw driver detail to the
 * client. Anything unrecognized becomes INTERNAL, never the raw message.
 */
export function mapPostgresError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const pgError = error as { code?: string; message?: string } | undefined;

  if (pgError?.code === "42501") {
    return new AppError("FORBIDDEN", 403);
  }

  if (pgError?.message && isApiErrorCode(pgError.message)) {
    return new AppError(pgError.message, STATUS_BY_CODE[pgError.message] ?? 400);
  }

  console.error("[lua-server] unmapped error:", error);
  return new AppError("INTERNAL", 500);
}
