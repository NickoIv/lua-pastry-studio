import { isApiErrorCode, type ApiErrorCode } from "@lua/types";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Overrides the static API_ERROR_MESSAGES_RU text for this one response — used where the message needs request-specific detail (e.g. which products block a delete). */
  readonly detail?: string;

  constructor(code: ApiErrorCode, status = 400, detail?: string) {
    super(code);
    this.code = code;
    this.status = status;
    this.detail = detail;
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
  CATEGORY_NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  COLLECTION_NOT_FOUND: 404,
  VALIDATION: 422,
  CATEGORY_IN_USE: 409,
  RATE_LIMITED: 429,
  STAFF_NOT_FOUND: 404,
  OWNER_PROTECTED: 403,
  CUSTOMER_NOT_FOUND: 404,
  MEDIA_ASSET_IN_USE: 409,
  MEDIA_ASSET_NOT_FOUND: 404,
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
