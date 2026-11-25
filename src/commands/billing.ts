import { Command } from "commander";
import { ApiResponse, OrbitKitClient } from "../client";
import { EnvConfig, requireApiKey, resolveAppId } from "../env";
import { assertOk, handleApiError } from "../utils/errors";
import { printData, printError, printSuccess } from "../utils/output";

type Plan = "monthly" | "yearly";

function planArg(value: string): Plan {
  if (value !== "monthly" && value !== "yearly") {
    printError(`Unknown plan: ${value}. Use monthly or yearly.`);
    process.exit(2);
  }
  return value;
}

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

/** The API's error code and first detail, from an error response. */
function errorOf(res: ApiResponse): { code?: string; reason?: unknown } {
  const body = res.data as { error?: { code?: string; details?: Array<{ reason?: unknown }> } } | null;
  return { code: body?.error?.code, reason: body?.error?.details?.[0]?.reason };
}

export function registerBillingCommands(program: Command, env: EnvConfig): void {
  program
    .command("subscribe")
    .description("Publish an app; without a subscription, prints a Stripe Checkout link to subscribe")
    .argument("[appId]", "App ID (or set ORBITKIT_APP_ID)")
    .option("--plan <plan>", "monthly or yearly, for a new subscription", "yearly")
    .action(async (argAppId: string | undefined, opts: { plan: string }) => {
      requireApiKey(env);
      const plan = planArg(opts.plan);
      const appId = resolveAppId(argAppId, env);
      const app = encodeURIComponent(appId);
      const client = new OrbitKitClient(env);

      const deployed = await client.post<{ url: string }>(`/api/apps/${app}/deploy`);
      if (deployed.ok) {
        if (env.json) return printData(deployed.data, true);
        return printSuccess(`Deployed: ${deployed.data.url}`);
      }
      const { code, reason } = errorOf(deployed);
      // Anything but "no subscription" (an unpaid one carries its invoice link).
      if (deployed.status !== 402 || code !== "SUBSCRIPTION_REQUIRED" || reason === "subscription_unpaid") {
        handleApiError(deployed);
      }

      const session = assertOk(
        await client.post<{ url: string; expiresAt?: number }>(`/api/apps/${app}/checkout-session`, { plan })
      );
      if (env.json) return printData(session, true);
      process.stdout.write(
        `No subscription yet. Open this link to subscribe (${plan}); the app is published once payment completes:\n\n  ${session.url}\n\n`
      );
      if (session.expiresAt) {
        process.stdout.write(`The link expires ${new Date(session.expiresAt * 1000).toLocaleString()}.\n`);
      }
    });

  const plan = program.command("plan").description("Switch between the monthly and yearly plans");

  plan
    .command("preview")
    .description("Show what switching plans would invoice today, without changing anything")
    .argument("<plan>", "monthly or yearly")
    .action(async (value: string) => {
      requireApiKey(env);
      const data = assertOk(
        await new OrbitKitClient(env).post<{ amountDue: number; total: number; currency: string; creditToBalance: number }>(
          "/api/change-plan/preview",
          { plan: planArg(value) }
        )
      );
      if (env.json) return printData(data, true);
      process.stdout.write(`Due today: ${money(data.amountDue, data.currency)}\n`);
      if (data.creditToBalance > 0) {
        process.stdout.write(`Credit to your balance: ${money(data.creditToBalance, data.currency)}\n`);
      }
    });

  plan
    .command("change")
    .description("Switch plans (bills today: the new plan for every site, minus unused time)")
    .argument("<plan>", "monthly or yearly")
    .action(async (value: string) => {
      requireApiKey(env);
      const data = assertOk(await new OrbitKitClient(env).post("/api/change-plan", { plan: planArg(value) }));
      if (env.json) return printData(data, true);
      printSuccess(`Switched to the ${value} plan.`);
    });

  program
    .command("cancel")
    .description("Cancel the subscription at the end of the billing period (sites stay live until then)")
    .action(async () => {
      requireApiKey(env);
      const data = assertOk(await new OrbitKitClient(env).post("/api/cancel-subscription"));
      if (env.json) return printData(data, true);
      printSuccess("Subscription will end at the end of the billing period.");
    });

  program
    .command("reactivate")
    .description("Undo a pending cancellation")
    .action(async () => {
      requireApiKey(env);
      const data = assertOk(await new OrbitKitClient(env).post("/api/reactivate-subscription"));
      if (env.json) return printData(data, true);
      printSuccess("Subscription reactivated.");
    });

  program
    .command("invoices")
    .description("List recent invoices")
    .action(async () => {
      requireApiKey(env);
      const data = assertOk(
        await new OrbitKitClient(env).get<{
          invoices: Array<{ number: string; amount: number; currency: string; status: string; created: number; pdfUrl?: string }>;
        }>("/api/invoices")
      );
      if (env.json) return printData(data, true);
      printData(
        data.invoices.map((i) => ({
          Date: new Date(i.created * 1000).toLocaleDateString(),
          Number: i.number,
          Amount: money(i.amount, i.currency),
          Status: i.status,
          PDF: i.pdfUrl ?? "",
        })),
        false
      );
    });
}
