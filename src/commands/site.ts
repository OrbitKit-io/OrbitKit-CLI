import { Command } from "commander";
import * as fs from "fs";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk } from "../utils/errors";
import { printData, printSuccess } from "../utils/output";

export function registerSiteCommands(program: Command, env: EnvConfig): void {
  const site = program
    .command("site")
    .description("Manage site configuration");

  site
    .command("get")
    .description("Get site configuration")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.get(`/api/apps/${encodeURIComponent(appId)}/site`);
      printData(assertOk(res), env.json);
    });

  site
    .command("update")
    .description("Update site configuration")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .option("--name <name>", "App name")
    .option("--description <desc>", "App description")
    .option("--slug <slug>", "Site slug")
    .action(async (argAppId: string | undefined, opts: { name?: string; description?: string; slug?: string }) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const body: Record<string, string> = {};
      if (opts.name) body.appName = opts.name;
      if (opts.description) body.description = opts.description;
      if (opts.slug) body.slug = opts.slug;
      const client = new OrbitKitClient(env);
      const res = await client.patch(`/api/apps/${encodeURIComponent(appId)}/site`, body);
      assertOk(res);
      printSuccess("Site updated.");
    });

  site
    .command("icon")
    .description("Upload app icon")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .argument("[file]", "Path to icon image (PNG/JPEG, max 2MB)")
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
      const buffer = fs.readFileSync(filePath);
      const ext = filePath.toLowerCase().split(".").pop();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const fileName = filePath.split("/").pop() || "icon.png";
      const client = new OrbitKitClient(env);
      const res = await client.uploadForm(`/api/apps/${encodeURIComponent(appId)}/site/icon`, buffer, fileName, mime);
      assertOk(res);
      printSuccess("Icon uploaded.");
    });

  // Domain subcommands
  const domain = site
    .command("domain")
    .description("Manage custom domain");

  domain
    .command("set")
    .description("Set custom domain")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .argument("[domain]", "Domain name (e.g., privacy.myapp.com)")
    .action(async (argAppId: string, domainArg?: string) => {
      requireApiKey(env);
      let appId: string;
      let domainName: string;
      if (domainArg) {
        appId = resolveAppId(argAppId, env);
        domainName = domainArg;
      } else {
        appId = resolveAppId(undefined, env);
        domainName = argAppId;
      }
      const client = new OrbitKitClient(env);
      const res = await client.put(`/api/apps/${encodeURIComponent(appId)}/site/domain`, { domain: domainName });
      printData(assertOk(res), env.json);
    });

  domain
    .command("status")
    .description("Check domain DNS/SSL status")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.get(`/api/apps/${encodeURIComponent(appId)}/site/domain/status`);
      printData(assertOk(res), env.json);
    });

  domain
    .command("remove")
    .description("Remove custom domain")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.delete(`/api/apps/${encodeURIComponent(appId)}/site/domain`);
      assertOk(res);
      printSuccess("Custom domain removed.");
    });
}
