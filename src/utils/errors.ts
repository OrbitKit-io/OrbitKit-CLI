/**
 * Map API error codes to user-friendly, actionable messages.
 * Per CLI best practices: trackable codes + actionable guidance.
 */

import { ApiResponse } from "../client";
import { printError } from "./output";

interface ErrorBody {
  code?: string;
  message?: string;
  error?: string | { code?: string; message?: string };
}

const ERROR_GUIDANCE: Record<string, string> = {
  UNAUTHORIZED: "Check your API key. Set ORBITKIT_API_KEY or create a new key at the dashboard.",
  FORBIDDEN: "You don't have permission. Verify the app ID and your account access.",
  NOT_FOUND: "Resource not found. Check the app ID and resource name.",
  SUBSCRIPTION_REQUIRED: "An active subscription is required. Visit https://orbitkit.io/dashboard to subscribe.",
  VALIDATION_FAILED: "Invalid input. Check the data format and try again.",
  RATE_LIMITED: "Rate limit exceeded. Wait a moment and try again.",
  APP_LIMIT_REACHED: "App limit reached. Delete an existing app or upgrade your plan.",
  DEPLOY_FAILED: "Deploy failed on the server. Try again or contact support.",
};

/**
 * Handle an API error response: print actionable message, exit with appropriate code.
 */
export function handleApiError(res: ApiResponse): never {
  const body = (typeof res.data === "object" && res.data !== null ? res.data : {}) as ErrorBody;
  // API errors may be nested: { error: { code, message } } or flat: { code, message }
  const nested = typeof body?.error === "object" && body.error !== null ? body.error : null;
  const code = nested?.code || body?.code || (typeof body?.error === "string" ? body.error : null) || `HTTP_${res.status}`;
  const message = nested?.message || body?.message || (res.status === 404 ? "Not found" : "Request failed");
  const guidance = ERROR_GUIDANCE[code] || "";
  const requestId = res.requestId ? ` (request: ${res.requestId})` : "";

  printError(`${code}: ${message}${requestId}`);
  if (guidance) {
    process.stderr.write(`  → ${guidance}\n`);
  }

  // Exit codes: 1=general, 2=validation, 3=auth
  if (res.status === 401 || res.status === 403) {
    process.exit(3);
  } else if (res.status === 400 || res.status === 422) {
    process.exit(2);
  } else {
    process.exit(1);
  }
}

/**
 * Assert response is OK, or handle the error.
 */
export function assertOk<T>(res: ApiResponse<T>): T {
  if (!res.ok) {
    handleApiError(res);
  }
  return res.data;
}
