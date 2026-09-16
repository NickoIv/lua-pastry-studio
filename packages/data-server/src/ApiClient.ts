import { isApiErrorCode, type ApiErrorCode } from "@lua/types";

export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export interface ApiClientOptions {
  /** e.g. "http://192.168.1.23:4000/api" for LAN/phone testing — see docs/LOCAL-BACKEND.md. */
  baseUrl: string;
  /** Called whenever the client gets a fresh token issued (login) or loses one (401). */
  onTokenChange?: (token: string | null) => void;
}

/**
 * Thin typed fetch wrapper for packages/server's REST API. Holds the
 * session JWT in memory only — callers decide whether/where to persist
 * it (see each app's session storage) via `onTokenChange`.
 */
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private onTokenChange?: (token: string | null) => void;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.onTokenChange = options.onTokenChange;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiRequestError("INTERNAL", "Не удалось связаться с сервером Lua.");
    }

    if (response.status === 401) {
      this.token = null;
      this.onTokenChange?.(null);
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const code = payload?.error?.code;
      if (typeof code === "string" && isApiErrorCode(code)) {
        throw new ApiRequestError(code, payload.error.message ?? code);
      }
      throw new ApiRequestError("INTERNAL", "Что-то пошло не так.");
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }
  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
