import { Command } from "commander";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess } from "../utils/output";
import { outputPages } from "../utils/pages";

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
    .description("Show deploy history, or one deploy's pages with --entry")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .option("--entry <id>", "A deploy's ID: list its pages as published")
    .option("--out <dir>", "With --entry, write each page to <dir>/<page>.html")
    .action(async (argAppId: string | undefined, opts: { entry?: string; out?: string }) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      if (opts.entry) {
        const entry = assertOk(
          await client.get<{ renderedPages?: Record<string, string> | null }>(
            `/api/apps/${encodeURIComponent(appId)}/deploy-history/${encodeURIComponent(opts.entry)}`
          )
        );
        return outputPages(entry.renderedPages, opts.out, env.json);
      }
      const res = await client.get<Array<{ id: string; deployedAt: number; pages: string[]; url: string }>>(`/api/apps/${encodeURIComponent(appId)}/deploy-history`);
      const data = assertOk(res);
      const entries = Array.isArray(data) ? data : [];
      if (env.json) return printData(entries, true);
      const rows = entries.map((e) => ({
        ID: e.id,
        Date: new Date(e.deployedAt).toLocaleString(),
        Pages: e.pages.join(", "),
        URL: e.url,
      }));
      printData(rows, env.json);
    });
}
