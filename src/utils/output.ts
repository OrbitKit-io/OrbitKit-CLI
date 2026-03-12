/**
 * Output formatting utilities.
 * Respects NO_COLOR env var per https://no-color.org/
 */

import pc from "picocolors";

/** Print structured data as JSON (--json mode) or human-readable table. */
export function printData(data: unknown, jsonMode: boolean): void {
  if (jsonMode) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return;
  }

  if (data === null || data === undefined) {
    process.stdout.write("(not configured)\n");
  } else if (Array.isArray(data)) {
    printTable(data);
  } else if (typeof data === "object") {
    printKeyValue(data as Record<string, unknown>);
  } else {
    process.stdout.write(String(data) + "\n");
  }
}

/** Print an array of objects as an aligned table. */
function printTable(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    process.stdout.write("(no results)\n");
    return;
  }

  const keys = Object.keys(rows[0]);
  const widths = keys.map((k) =>
    Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length))
  );

  // Header
  const header = keys.map((k, i) => pc.bold(k.padEnd(widths[i]))).join("  ");
  process.stdout.write(header + "\n");
  process.stdout.write(widths.map((w) => "─".repeat(w)).join("  ") + "\n");

  // Rows
  for (const row of rows) {
    const line = keys.map((k, i) => String(row[k] ?? "").padEnd(widths[i])).join("  ");
    process.stdout.write(line + "\n");
  }
}

/** Format a value for display, handling Firestore timestamps and nested objects. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    // Firestore Timestamp: { _seconds, _nanoseconds }
    if ("_seconds" in obj && typeof obj._seconds === "number") {
      return new Date(obj._seconds * 1000).toLocaleString();
    }
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

/** Print a single object as key: value pairs. */
function printKeyValue(obj: Record<string, unknown>): void {
  const maxKey = Math.max(...Object.keys(obj).map((k) => k.length));
  for (const [key, value] of Object.entries(obj)) {
    const label = pc.bold(key.padEnd(maxKey));
    process.stdout.write(`${label}  ${formatValue(value)}\n`);
  }
}

/** Print a success message. */
export function printSuccess(message: string): void {
  process.stdout.write(pc.green("✓") + " " + message + "\n");
}

/** Print an error message to stderr. */
export function printError(message: string): void {
  process.stderr.write(pc.red("✗") + " " + message + "\n");
}

/** Print a warning message to stderr. */
export function printWarning(message: string): void {
  process.stderr.write(pc.yellow("!") + " " + message + "\n");
}

/** Mask an API key for safe display: ok_BRTRKF...XXHCG */
export function maskApiKey(key: string): string {
  if (key.length <= 10) return key.slice(0, 3) + "...";
  return key.slice(0, 9) + "..." + key.slice(-5);
}
