/**
 * Environment variable configuration.
 * All auth and config is via env vars — no stored credentials on disk.
 */

export interface EnvConfig {
  apiKey: string;
  appId?: string;
  apiEndpoint: string;
  debug: boolean;
  noColor: boolean;
  json: boolean;
}

export function loadEnv(): EnvConfig {
  return {
    apiKey: process.env.ORBITKIT_API_KEY || "",
    appId: process.env.ORBITKIT_APP_ID || undefined,
    apiEndpoint: (process.env.ORBITKIT_API_ENDPOINT || "https://api.orbitkit.io").replace(/\/$/, ""),
    debug: process.env.ORBITKIT_DEBUG === "1" || process.env.DEBUG === "1",
    noColor: !!(process.env.NO_COLOR || process.env.ORBITKIT_NO_COLOR),
    json: false,
  };
}

/**
 * Resolve the app ID from the command argument or env var.
 * Exits with code 2 if neither is provided.
 */
export function resolveAppId(argAppId: string | undefined, env: EnvConfig): string {
  const appId = argAppId || env.appId;
  if (!appId) {
    process.stderr.write(
      "Error (E2001): App ID required. Provide as argument or set ORBITKIT_APP_ID.\n"
    );
    process.exit(2);
  }
  return appId;
}

/**
 * Ensure API key is set. Exits with code 3 if missing.
 */
export function requireApiKey(env: EnvConfig): string {
  if (!env.apiKey) {
    process.stderr.write(
      "Error (E3001): API key required. Set ORBITKIT_API_KEY environment variable.\n" +
      "  Create an API key at https://orbitkit.io/dashboard (Settings → API Keys).\n"
    );
    process.exit(3);
  }
  return env.apiKey;
}
