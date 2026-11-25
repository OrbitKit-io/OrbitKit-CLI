import { Command } from "commander";
import * as fs from "fs";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess } from "../utils/output";
import { appAndArg, outputPages } from "../utils/pages";

interface Overview {
  appName: string;
  slug: string;
  subscribed: boolean;
  capabilities: Array<{ id: string; status: string }>;
  deploy: { state: string; deployedAt: number | null; publishable: boolean; reviewPending: boolean; missing: string[] };
  live: { baseUrl: string; urls: Record<string, string> } | null;
}

export function registerOverviewCommands(program: Command, env: EnvConfig): void {
  program
    .command("overview")
    .description("Show an app's capabilities, publish status and live URLs")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const res = await new OrbitKitClient(env).get<Overview>(`/api/apps/${encodeURIComponent(appId)}/overview`);
      const data = assertOk(res);
      if (env.json) return printData(data, true);
      const d = data.deploy;
      const state =
        d.state === "never" ? "not published" : d.state === "current" ? "published, up to date" : "published, with changes not live";
      process.stdout.write(`${data.appName} (${data.slug})\n`);
      process.stdout.write(`Status: ${state}${d.deployedAt ? ` — last deploy ${new Date(d.deployedAt).toLocaleString()}` : ""}\n`);
      process.stdout.write(`Can publish: ${d.publishable ? "yes" : "no"}${d.reviewPending ? " (privacy answers need review)" : ""}\n`);
      for (const m of d.missing) process.stdout.write(`  missing: ${m}\n`);
      process.stdout.write("\n");
      printData(data.capabilities.map((c) => ({ Capability: c.id, Status: c.status })), false);
      if (data.live) {
        process.stdout.write("\n");
        printData(Object.entries(data.live.urls).map(([page, url]) => ({ Page: page, URL: url })), false);
      }
    });

  program
    .command("status")
    .description("Show subscription status, app and published site counts")
    .action(async () => {
      requireApiKey(env);
      printData(assertOk(await new OrbitKitClient(env).get("/api/status")), env.json);
    });

  program
    .command("preview")
    .description("Render the site without publishing (lists pages, or writes them with --out)")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .option("--out <dir>", "Write each page to <dir>/<page>.html")
    .action(async (argAppId: string | undefined, opts: { out?: string }) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const res = await new OrbitKitClient(env).post<{ pages: Record<string, string> }>(
        `/api/apps/${encodeURIComponent(appId)}/preview`
      );
      outputPages(assertOk(res).pages, opts.out, env.json);
    });

  const profile = program.command("profile").description("Manage the app profile (app info and privacy answers)");

  profile
    .command("get")
    .description("Show the app profile")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      printData(assertOk(await new OrbitKitClient(env).get(`/api/apps/${encodeURIComponent(appId)}/profile`)), env.json);
    });

  profile
    .command("set")
    .description("Update the app profile from a JSON file (only the fields in the file change)")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .argument("[file]", "Path to JSON file, e.g. the output of `orbitkit --json profile get`")
    .action(async (first?: string, second?: string) => {
      requireApiKey(env);
      const [argAppId, file] = appAndArg(first, second);
      const appId = resolveAppId(argAppId, env);
      if (!file) {
        process.stderr.write("Error (E2001): A JSON file is required.\n");
        process.exit(2);
      }
      const body = JSON.parse(fs.readFileSync(file, "utf-8"));
      const res = await new OrbitKitClient(env).patch(`/api/apps/${encodeURIComponent(appId)}/profile`, body);
      const data = assertOk(res);
      if (env.json) printData(data, true);
      else printSuccess("Profile updated.");
    });
}
