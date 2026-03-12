/**
 * HTTP client wrapping Node's built-in fetch.
 * Sends API key via Authorization header; returns typed responses.
 */

import { EnvConfig } from "./env";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export class OrbitKitClient {
  private apiKey: string;
  private baseUrl: string;
  private debug: boolean;

  constructor(env: EnvConfig) {
    this.apiKey = env.apiKey;
    this.baseUrl = env.apiEndpoint;
    this.debug = env.debug;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    contentType?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    let fetchBody: BodyInit | undefined;

    if (body !== undefined) {
      if (Buffer.isBuffer(body)) {
        headers["Content-Type"] = contentType || "application/octet-stream";
        fetchBody = new Uint8Array(body.buffer, body.byteOffset, body.byteLength) as unknown as BodyInit;
      } else {
        headers["Content-Type"] = "application/json";
        fetchBody = JSON.stringify(body);
      }
    }

    if (this.debug) {
      process.stderr.write(`[debug] ${method} ${url}\n`);
    }

    const res = await fetch(url, { method, headers, body: fetchBody });
    const requestId = res.headers.get("x-request-id") || undefined;

    let data: T;
    const text = await res.text();
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }

    if (this.debug) {
      process.stderr.write(`[debug] ${res.status} ${requestId || ""}\n`);
    }

    return { ok: res.ok, status: res.status, data, requestId };
  }

  get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path);
  }

  post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, body);
  }

  put<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", path, body);
  }

  patch<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", path, body);
  }

  delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", path);
  }

  upload<T = unknown>(path: string, buffer: Buffer, contentType = "application/octet-stream"): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, buffer, contentType);
  }
}
