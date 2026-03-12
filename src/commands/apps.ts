import { Command } from "commander";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess, printError } from "../utils/output";
import * as readline from "readline";

interface AppRecord {
  appId: string;
  appName: string;
  createdAt: number | { _seconds: number };
}

/** Handle both Unix millis and Firestore Timestamp objects. */
function formatTimestamp(ts: number | { _seconds: number } | undefined): string {
  if (!ts) return "—";
  if (typeof ts === "object" && "_seconds" in ts) {
    return new Date(ts._seconds * 1000).toLocaleDateString();
  }
  // Could be seconds or milliseconds — if < 1e12 it's seconds
  const ms = typeof ts === "number" && ts < 1e12 ? ts * 1000 : ts;
  return new Date(ms as number).toLocaleDateString();
}

export function registerAppsCommands(program: Command, env: EnvConfig): void {
  const apps = program
    .command("apps")
    .description("Manage apps");

  apps
    .command("list")
    .description("List all apps")
    .action(async () => {
      requireApiKey(env);
      const client = new OrbitKitClient(env);
      const res = await client.get<AppRecord[]>("/api/apps");
      const data = assertOk(res);
      const rows = (Array.isArray(data) ? data : []).map((a) => ({
        "App ID": a.appId,
        Name: a.appName,
        Created: formatTimestamp(a.createdAt),
      }));
      printData(rows, env.json);
    });

  apps
    .command("create")
    .description("Create a new app")
    .argument("<name>", "App name")
    .action(async (name: string) => {
      requireApiKey(env);
      const client = new OrbitKitClient(env);
      const res = await client.post<{ appId: string }>("/api/apps", { appName: name });
      const data = assertOk(res);
      if (env.json) {
        printData(data, true);
      } else {
        printSuccess(`App created: ${data.appId}`);
      }
    });

  apps
    .command("delete")
    .description("Delete an app")
    .argument("<appId>", "App ID to delete")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (appId: string, opts: { yes?: boolean }) => {
      requireApiKey(env);
      if (!opts.yes) {
        const confirmed = await confirm(`Delete app ${appId}? This cannot be undone.`);
        if (!confirmed) {
          printError("Aborted.");
          process.exit(1);
        }
      }
      const client = new OrbitKitClient(env);
      const res = await client.delete(`/api/apps/${encodeURIComponent(appId)}`);
      assertOk(res);
      printSuccess(`App ${appId} deleted.`);
    });
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}
