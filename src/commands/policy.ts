import { Command } from "commander";
import * as fs from "fs";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess } from "../utils/output";
import { appAndArg, outputPages } from "../utils/pages";

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
    .argument("[file]", "Path to JSON file")
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
      const res = await client.put<{ warnings?: string[] }>(`/api/apps/${encodeURIComponent(appId)}/policy`, data);
      const saved = assertOk(res);
      if (env.json) return printData(saved, true);
      printSuccess("Policy updated.");
      for (const w of saved?.warnings ?? []) process.stderr.write(`  ! ${w}\n`);
    });

  policy
    .command("versions")
    .description("List the policy snapshots taken on each deploy, newest first")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .option("--limit <n>", "How many versions")
    .option("--start-after <snapshotAt>", "Continue after this version's snapshotAt")
    .action(async (argAppId: string | undefined, opts: { limit?: string; startAfter?: string }) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const query = new URLSearchParams();
      if (opts.limit) query.set("limit", opts.limit);
      if (opts.startAfter) query.set("startAfter", opts.startAfter);
      const qs = query.toString();
      const data = assertOk(
        await new OrbitKitClient(env).get<{ versions: Array<{ id: string; snapshotAt: number; pages: string[] }>; hasMore: boolean }>(
          `/api/apps/${encodeURIComponent(appId)}/policy-versions${qs ? `?${qs}` : ""}`
        )
      );
      if (env.json) return printData(data, true);
      printData(
        data.versions.map((v) => ({ ID: v.id, Date: new Date(v.snapshotAt).toLocaleString(), SnapshotAt: v.snapshotAt, Pages: v.pages.join(", ") })),
        false
      );
      if (data.hasMore) process.stdout.write("(more: pass --start-after with the last SnapshotAt)\n");
    });

  policy
    .command("version")
    .description("Show one policy snapshot's answers, or write its published pages with --out")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .argument("[versionId]", "Version ID (from `orbitkit policy versions`)")
    .option("--out <dir>", "Write each published page to <dir>/<page>.html")
    .action(async (first: string | undefined, second: string | undefined, opts: { out?: string }) => {
      requireApiKey(env);
      const [argAppId, versionId] = appAndArg(first, second);
      const appId = resolveAppId(argAppId, env);
      if (!versionId) {
        process.stderr.write("Error (E2001): Version ID required.\n");
        process.exit(2);
      }
      const data = assertOk(
        await new OrbitKitClient(env).get<{ policyData?: unknown; renderedPages?: Record<string, string> | null }>(
          `/api/apps/${encodeURIComponent(appId)}/policy-versions/${encodeURIComponent(versionId)}`
        )
      );
      if (opts.out) return outputPages(data.renderedPages, opts.out, env.json);
      printData(data.policyData ?? null, true);
    });
}
