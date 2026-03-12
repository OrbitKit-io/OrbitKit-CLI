import { Command } from "commander";
import { OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey } from "../env";
import { assertOk } from "../utils/errors";
import { printData, maskApiKey } from "../utils/output";

export function registerWhoamiCommand(program: Command, env: EnvConfig): void {
  program
    .command("whoami")
    .description("Show current user info (verifies API key)")
    .action(async () => {
      requireApiKey(env);
      const client = new OrbitKitClient(env);
      const res = await client.get<{
        profile: { email: string; displayName: string | null; memberSince: number };
        stats: { appCount: number; activeSubscriptions: number };
      }>("/api/account");
      const data = assertOk(res);
      if (env.json) {
        printData(data, true);
      } else {
        printData({
          Email: data.profile.email,
          Name: data.profile.displayName || "(not set)",
          "Member since": new Date(data.profile.memberSince).toLocaleDateString(),
          Apps: data.stats.appCount,
          "Active subscriptions": data.stats.activeSubscriptions,
          "API key": maskApiKey(env.apiKey),
        }, false);
      }
    });
}
