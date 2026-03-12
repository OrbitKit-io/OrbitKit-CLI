import { Command } from "commander";
import * as fs from "fs";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess } from "../utils/output";

export function registerDeletionCommands(program: Command, env: EnvConfig): void {
  const deletion = program
    .command("deletion")
    .description("Manage data deletion page");

  deletion
    .command("get")
    .description("Get deletion page config")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.get(`/api/apps/${encodeURIComponent(appId)}/deletion-page`);
      printData(assertOk(res), env.json);
    });

  deletion
    .command("set")
    .description("Upload deletion page from JSON file")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .argument("[file]", "Path to JSON file")
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
      const res = await client.put(`/api/apps/${encodeURIComponent(appId)}/deletion-page`, data);
      assertOk(res);
      printSuccess("Deletion page updated.");
    });
}
