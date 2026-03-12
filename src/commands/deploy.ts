import { Command } from "commander";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess } from "../utils/output";

export function registerDeployCommands(program: Command, env: EnvConfig): void {
  program
    .command("deploy")
    .description("Deploy site to production")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.post<{ url: string; deployedAt: number }>(`/api/apps/${encodeURIComponent(appId)}/deploy`);
      const data = assertOk(res);
      if (env.json) {
        printData(data, true);
      } else {
        printSuccess(`Deployed: ${data.url}`);
      }
    });

  program
    .command("deploy-history")
    .description("Show deploy history")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.get<Array<{ deployedAt: number; pages: string[]; url: string }>>(`/api/apps/${encodeURIComponent(appId)}/deploy-history`);
      const data = assertOk(res);
      const entries = Array.isArray(data) ? data : [];
      const rows = entries.map((e) => ({
        Date: new Date(e.deployedAt).toLocaleString(),
        Pages: e.pages.join(", "),
        URL: e.url,
      }));
      printData(rows, env.json);
    });
}
