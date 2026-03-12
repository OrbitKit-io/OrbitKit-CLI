#!/usr/bin/env node

/**
 * OrbitKit CLI — App Store compliance hosting for iOS developers.
 * Wraps the OrbitKit REST API for use in terminals and CI/CD pipelines.
 *
 * Authentication: ORBITKIT_API_KEY environment variable (no stored credentials).
 * Docs: https://orbitkit.io/api
 */

import { Command } from "commander";
import { loadEnv } from "./env";
import { printError } from "./utils/output";
import { registerWhoamiCommand } from "./commands/whoami";
import { registerAppsCommands } from "./commands/apps";
import { registerDeployCommands } from "./commands/deploy";
import { registerPolicyCommands } from "./commands/policy";
import { registerSiteCommands } from "./commands/site";
import { registerSupportCommands } from "./commands/support";
import { registerDeletionCommands } from "./commands/deletion";
import { registerAasaCommands } from "./commands/aasa";
import { registerBannerCommands } from "./commands/banner";
import { registerWellKnownCommands } from "./commands/well-known";
import { registerTestFlightCommands } from "./commands/testflight";

const env = loadEnv();

const program = new Command();

program
  .name("orbitkit")
  .description("CLI for OrbitKit — App Store compliance hosting for iOS developers")
  .version("1.0.0")
  .option("--json", "Output as JSON (machine-readable)")
  .option("--debug", "Enable debug output")
  .hook("preAction", (_thisCommand, actionCommand) => {
    // Propagate global options to env
    const opts = program.opts();
    if (opts.json) env.json = true;
    if (opts.debug) env.debug = true;

    // Suppress default error handling for unknown commands
    void actionCommand;
  });

// Register all commands
registerWhoamiCommand(program, env);
registerAppsCommands(program, env);
registerDeployCommands(program, env);
registerPolicyCommands(program, env);
registerSiteCommands(program, env);
registerSupportCommands(program, env);
registerDeletionCommands(program, env);
registerAasaCommands(program, env);
registerBannerCommands(program, env);
registerWellKnownCommands(program, env);
registerTestFlightCommands(program, env);

// Handle SIGINT gracefully (per CLI best practices)
process.on("SIGINT", () => {
  process.stderr.write("\n");
  process.exit(130); // 128 + SIGINT(2)
});

// Global error handler — actionable messages with trackable codes
program.parseAsync(process.argv).catch((err: Error) => {
  if (env.debug) {
    console.error(err);
  }
  // Network errors
  if (err.message.includes("fetch failed") || err.message.includes("ECONNREFUSED")) {
    printError("E5001: Could not connect to OrbitKit API.");
    process.stderr.write(`  → Check your internet connection or ORBITKIT_API_ENDPOINT setting.\n`);
    process.stderr.write(`  → Current endpoint: ${env.apiEndpoint}\n`);
    process.exit(1);
  }
  // JSON parse errors (bad file input)
  if (err instanceof SyntaxError && err.message.includes("JSON")) {
    printError("E2002: Invalid JSON file.");
    process.stderr.write(`  → Check the file format and try again.\n`);
    process.exit(2);
  }
  // File not found
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    printError(`E2003: File not found: ${(err as NodeJS.ErrnoException).path || ""}`);
    process.exit(2);
  }
  printError(err.message);
  process.exit(1);
});
