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
    .option(
      "--search-indexing <true|false>",
      "Allow search engines to index hosted pages (default true). TestFlight beta pages are always excluded regardless.",
    )
    .action(async (argAppId: string | undefined, opts: { name?: string; description?: string; slug?: string; searchIndexing?: string }) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const body: Record<string, string | boolean> = {};
      if (opts.name) body.appName = opts.name;
      if (opts.description) body.description = opts.description;
      if (opts.slug) body.slug = opts.slug;
      if (opts.searchIndexing !== undefined) {
        const v = opts.searchIndexing.toLowerCase();
        if (v !== "true" && v !== "false") {
          throw new Error("--search-indexing must be 'true' or 'false'");
        }
        body.searchIndexing = v === "true";
      }
      const client = new OrbitKitClient(env);
      const res = await client.patch(`/api/apps/${encodeURIComponent(appId)}/site`, body);
      assertOk(res);
      printSuccess(
        opts.searchIndexing !== undefined
          ? `Site updated. Run \`orbitkit deploy ${appId}\` to publish the indexing change.`
          : "Site updated.",
      );
    });

  // Custom homepage HTML subcommands
  const customHtml = site
    .command("custom-html")
    .description("Manage custom homepage HTML (replaces the default hero section)");

  customHtml
    .command("set")
    .description("Set custom homepage HTML from a string or file")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .option("--file <path>", "Read HTML from file (max 50KB)")
    .option("--html <html>", "Inline HTML string")
    .action(async (argAppId: string | undefined, opts: { file?: string; html?: string }) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      let html: string;
      if (opts.file) {
        html = fs.readFileSync(opts.file, "utf-8");
      } else if (opts.html) {
        html = opts.html;
      } else {
        throw new Error("Provide --file <path> or --html <string>");
      }
      const sizeBytes = Buffer.byteLength(html, "utf-8");
      if (sizeBytes > 51200) {
        throw new Error(`Custom HTML is ${sizeBytes} bytes — max is 51200 bytes (50KB)`);
      }
      const client = new OrbitKitClient(env);
      const res = await client.patch(
        `/api/apps/${encodeURIComponent(appId)}/site`,
        { customHomepageHtml: html },
      );
      assertOk(res);
      printSuccess(`Custom homepage HTML set (${sizeBytes} bytes). Run \`orbitkit deploy ${appId}\` to publish.`);
    });

  customHtml
    .command("clear")
    .description("Clear custom homepage HTML and revert to the default hero section")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.patch(
        `/api/apps/${encodeURIComponent(appId)}/site`,
        { customHomepageHtml: "" },
      );
      assertOk(res);
      printSuccess("Custom homepage HTML cleared. Run `orbitkit deploy` to publish.");
    });

  customHtml
    .command("get")
    .description("Print the currently saved custom homepage HTML")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .action(async (argAppId?: string) => {
      requireApiKey(env);
      const appId = resolveAppId(argAppId, env);
      const client = new OrbitKitClient(env);
      const res = await client.get(`/api/apps/${encodeURIComponent(appId)}/site`);
      const data = assertOk(res) as { customHomepageHtml?: string } | null;
      const html = data?.customHomepageHtml ?? "";
      if (env.json) {
        printData({ customHomepageHtml: html }, true);
      } else if (!html) {
        // eslint-disable-next-line no-console
        console.log("(no custom homepage HTML set — using default hero section)");
      } else {
        // eslint-disable-next-line no-console
        console.log(html);
      }
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
