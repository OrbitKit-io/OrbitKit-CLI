import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess } from "../utils/output";

/**
 * `orbitkit privacy-manifest …` commands for the iOS PrivacyInfo.xcprivacy file.
 *
 *   orbitkit privacy-manifest get [appId]          — show the saved JSON config
 *   orbitkit privacy-manifest set [appId] <file>   — upload JSON config
 *   orbitkit privacy-manifest sync [appId]         — derive a starter from the
 *                                                    privacy wizard (read-only)
 *   orbitkit privacy-manifest download [appId]     — download .xcprivacy file
 *                                                    (use --out to specify path)
 *   orbitkit privacy-manifest reference            — list Apple's allowlists
 */
export function registerPrivacyManifestCommands(program: Command, env: EnvConfig): void {
  const pm = program
    .command("privacy-manifest")
    .description("Manage PrivacyInfo.xcprivacy (privacy manifest) configuration");

  pm
    .command("get")
    .description("Show the saved privacy manifest config (or a wizard-derived starter)")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.get(`/api/apps/${encodeURIComponent(appId)}/privacy-manifest`);
      printData(assertOk(res), env.json);
    });

  pm
    .command("set")
    .description("Upload privacy manifest config from a JSON file")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .argument("<file>", "Path to JSON file matching the manifest schema")
    .action(async (argAppId: string, file?: string) => {
      requireApiKey(env);
      let appId: string;
      let filePath: string;
      if (file) {
        appId = resolveAppId(argAppId, env);
        filePath = file;
      } else {
        appId = resolveAppId(undefined, env);
        filePath = argAppId;
      }
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const client = new OrbitKitClient(env);
      const res = await client.put(`/api/apps/${encodeURIComponent(appId)}/privacy-manifest`, data);
      assertOk(res);
      printSuccess("Privacy manifest configuration updated.");
    });

  pm
    .command("sync")
    .description("Show a privacy manifest config freshly derived from the privacy wizard (read-only)")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.post(`/api/apps/${encodeURIComponent(appId)}/privacy-manifest/sync-from-wizard`);
      printData(assertOk(res), env.json);
    });

  pm
    .command("download")
    .description("Download the rendered PrivacyInfo.xcprivacy file")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .option("-o, --out <path>", "Output path (default: ./PrivacyInfo.xcprivacy)")
    .action(async (argAppId: string | undefined, opts: { out?: string }) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.get<string>(`/api/apps/${encodeURIComponent(appId)}/privacy-manifest.xcprivacy`);
      if (!res.ok) {
        // assertOk handles non-OK uniformly (prints + exits).
        assertOk(res);
        return;
      }
      const xml = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      const outPath = path.resolve(opts.out || "./PrivacyInfo.xcprivacy");
      fs.writeFileSync(outPath, xml, "utf-8");
      printSuccess(`Wrote ${outPath} (${Buffer.byteLength(xml, "utf-8")} bytes)`);
    });

  pm
    .command("reference")
    .description("Show Apple's allowlists for data types, purposes, and Required Reason API codes")
    .action(async () => {
      requireApiKey(env);
      const client = new OrbitKitClient(env);
      const res = await client.get("/api/privacy-manifest/reference");
      printData(assertOk(res), env.json);
    });
}
