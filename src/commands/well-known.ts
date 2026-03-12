import { Command } from "commander";
import * as fs from "fs";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printSuccess, printError } from "../utils/output";

const ALLOWED_FILES = [
  "apple-developer-domain-association.txt",
  "apple-developer-merchantid-domain-association",
  "apple-wallet-order-type-association",
];

export function registerWellKnownCommands(program: Command, env: EnvConfig): void {
  program
    .command("well-known")
    .description("Upload well-known files (SIWA, Apple Pay, Wallet)")
    .command("upload")
    .description("Upload a well-known file")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .argument("<file>", "Path to the file")
    .option("--name <fileName>", "Override file name (auto-detected from path)")
    .action(async (argAppId: string, file?: string, opts?: { name?: string }) => {
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

      // Determine the well-known file name
      const baseName = opts?.name || filePath.split("/").pop() || "";
      // Strip .txt extension for matching flexibility
      const fileName = ALLOWED_FILES.find((f) => f === baseName || f.startsWith(baseName));
      if (!fileName) {
        printError(`Unknown file: ${baseName}`);
        process.stderr.write(`  Allowed files: ${ALLOWED_FILES.join(", ")}\n`);
        process.exit(2);
      }

      const buffer = Buffer.from(fs.readFileSync(filePath));
      const client = new OrbitKitClient(env);
      const res = await client.upload(`/api/apps/${encodeURIComponent(appId)}/well-known/${encodeURIComponent(fileName)}`, buffer);
      assertOk(res);
      printSuccess(`Uploaded ${fileName}`);
    });
}
