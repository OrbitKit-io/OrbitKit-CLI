import { Command } from "commander";
import * as fs from "fs";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess } from "../utils/output";

export function registerPolicyCommands(program: Command, env: EnvConfig): void {
  const policy = program
    .command("policy")
    .description("Manage privacy policy");

  policy
    .command("get")
    .description("Get privacy policy data")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.get(`/api/apps/${encodeURIComponent(appId)}/policy`);
      printData(assertOk(res), env.json);
    });

  policy
    .command("set")
    .description("Upload privacy policy from JSON file")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .argument("<file>", "Path to JSON file")
    .action(async (argAppId: string, file?: string) => {
      requireApiKey(env);
      // Handle case where appId is omitted and file is in first position
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
      const res = await client.put(`/api/apps/${encodeURIComponent(appId)}/policy`, data);
      assertOk(res);
      printSuccess("Policy updated.");
    });
}
