# OrbitKit CLI

[![npm version](https://img.shields.io/npm/v/@orbitkit-io/cli?color=blue)](https://www.npmjs.com/package/@orbitkit-io/cli)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache_2.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

Command-line interface for [OrbitKit](https://orbitkit.io) — App Store compliance hosting for iOS developers. Manage your apps, privacy policies, support pages, app site association files, and deployments from the terminal or CI/CD pipelines.

## Installation

```bash
npm install -g @orbitkit-io/cli
```

Requires Node.js 22 or later. The installed command is `orbitkit`.

## Quick Start

```bash
# Set your API key (create one at https://orbitkit.io/account/ → API Keys)
export ORBITKIT_API_KEY=ok_...

# Verify your key works
orbitkit whoami

# Set a default app ID (optional)
export ORBITKIT_APP_ID=your-app-id

# Deploy your site
orbitkit deploy
```

## Commands

### Account

| Command | Description |
|---------|-------------|
| `orbitkit whoami` | Display authenticated user info |
| `orbitkit status` | Subscription status, app and published site counts |

### App Management

| Command | Description |
|---------|-------------|
| `orbitkit apps list` | List all apps |
| `orbitkit apps create <name>` | Create a new app |
| `orbitkit apps delete <appId>` | Delete an app |
| `orbitkit overview [appId]` | Capability status, what blocks publishing, live URLs |
| `orbitkit profile get [appId]` | Print the app profile (app info and privacy answers) |
| `orbitkit profile set [appId] <file>` | Update the app profile from JSON (only the fields in the file) |

### Deploy

| Command | Description |
|---------|-------------|
| `orbitkit deploy [appId]` | Deploy site to production |
| `orbitkit preview [appId] [--out dir]` | Render the site without publishing |
| `orbitkit deploy-history [appId]` | Show deploy history |
| `orbitkit deploy-history [appId] --entry <id> [--out dir]` | One deploy's pages as published |

### Privacy Policy

| Command | Description |
|---------|-------------|
| `orbitkit policy get [appId]` | Print current policy data |
| `orbitkit policy set [appId] <file>` | Upload policy from JSON file |
| `orbitkit policy versions [appId]` | Policy snapshots taken on each deploy |
| `orbitkit policy version [appId] <versionId> [--out dir]` | One snapshot's answers, or its published pages |

### Site Configuration

| Command | Description |
|---------|-------------|
| `orbitkit site get [appId]` | Print site config |
| `orbitkit site update [appId]` | Update name, description, slug, or `--search-indexing <true\|false>` |
| `orbitkit site icon [appId] [file]` | Upload app icon |
| `orbitkit site custom-html set [appId]` | Set custom homepage HTML (`--file` or `--html`) |
| `orbitkit site custom-html get [appId]` | Print saved custom homepage HTML |
| `orbitkit site custom-html clear [appId]` | Revert to the default hero |
| `orbitkit site domain set [appId] <domain>` | Configure custom domain |
| `orbitkit site domain status [appId]` | Check DNS/SSL status |
| `orbitkit site domain remove [appId]` | Remove custom domain |

`--search-indexing` controls whether search engines may index the hosted pages (default `true`); TestFlight beta pages are always excluded. A deploy is required for the change to take effect.

### Privacy Manifest

| Command | Description |
|---------|-------------|
| `orbitkit privacy-manifest get [appId]` | Print the `PrivacyInfo.xcprivacy` config |
| `orbitkit privacy-manifest set [appId] <file>` | Upload manifest config from JSON |
| `orbitkit privacy-manifest apis [appId] <file>` | Save only the Required Reason APIs |
| `orbitkit privacy-manifest sync [appId]` | Derive the manifest from the privacy answers (read-only) |
| `orbitkit privacy-manifest download [appId] [-o path]` | Download the generated `PrivacyInfo.xcprivacy` |
| `orbitkit privacy-manifest reference` | Apple Required Reason API reference data |

### Support Page

| Command | Description |
|---------|-------------|
| `orbitkit support get [appId]` | Print support page config |
| `orbitkit support set [appId] <file>` | Upload from JSON file |

### Data Deletion Page

| Command | Description |
|---------|-------------|
| `orbitkit deletion get [appId]` | Print deletion page config |
| `orbitkit deletion set [appId] <file>` | Upload from JSON file |

### AASA (Apple App Site Association)

| Command | Description |
|---------|-------------|
| `orbitkit aasa get [appId]` | Print AASA config |
| `orbitkit aasa set [appId] <file>` | Upload AASA from JSON file |

### Smart App Banner

| Command | Description |
|---------|-------------|
| `orbitkit banner get [appId]` | Print banner config |
| `orbitkit banner set [appId] <file>` | Upload from JSON file |

### Well-Known Files

| Command | Description |
|---------|-------------|
| `orbitkit well-known upload [appId] <file>` | Upload well-known file (Sign in with Apple, Apple Pay, Wallet) |
| `orbitkit well-known remove [appId] <fileName>` | Remove an uploaded well-known file |

### TestFlight Landing Page

| Command | Description |
|---------|-------------|
| `orbitkit testflight get [appId]` | Print TestFlight page config |
| `orbitkit testflight set [appId] <file>` | Upload from JSON file |

### Billing

| Command | Description |
|---------|-------------|
| `orbitkit subscribe [appId] [--plan yearly\|monthly]` | Publish; without a subscription, prints a Stripe Checkout link |
| `orbitkit plan preview <plan>` | What switching plans would invoice today |
| `orbitkit plan change <plan>` | Switch between monthly and yearly |
| `orbitkit cancel` | Cancel at the end of the billing period |
| `orbitkit reactivate` | Undo a pending cancellation |
| `orbitkit invoices` | List recent invoices |

API keys and payment methods are managed in the browser at https://orbitkit.io/account/.

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (for scripting and piping to `jq`) |
| `--debug` | Enable debug output (HTTP requests, response codes) |
| `-V, --version` | Print version |
| `-h, --help` | Display help |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ORBITKIT_API_KEY` | Yes | API key (`ok_...`) from your [account page](https://orbitkit.io/account/) |
| `ORBITKIT_APP_ID` | No | Default app ID when `[appId]` is omitted |
| `ORBITKIT_API_ENDPOINT` | No | API base URL (default: `https://api.orbitkit.io`) |
| `NO_COLOR` | No | Disable colored output ([no-color.org](https://no-color.org/)) |

## CI/CD Usage

### GitHub Actions

Use the [OrbitKit Deploy](https://github.com/OrbitKit-io/OrbitKit-Deploy) action for simple deploys, or the CLI for more complex workflows:

```yaml
env:
  ORBITKIT_API_KEY: ${{ secrets.ORBITKIT_API_KEY }}
  ORBITKIT_APP_ID: ${{ vars.ORBITKIT_APP_ID }}

steps:
  - run: npx orbitkit policy set privacy-policy.json
  - run: npx orbitkit deploy
```

### Xcode Build Phase

The included `scripts/validate-aasa.sh` validates your AASA configuration against your app's entitlements at build time. Add it as a Run Script build phase in Xcode. See the [AASA documentation](https://orbitkit.io/api#aasa) for setup details.

## Security

- **No stored credentials** — authentication is via the `ORBITKIT_API_KEY` environment variable only. No credentials are written to disk.
- **Key masking** — the API key is never printed in full (displayed as `ok_BRTRKF...XXHCG`).
- **Secret scanning** — the `ok_` prefix enables [GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning) auto-detection.

## Documentation

- [OrbitKit Dashboard](https://orbitkit.io/dashboard/) — manage your apps; API keys are on the [account page](https://orbitkit.io/account/)
- [API Documentation](https://orbitkit.io/api) — full REST API reference
- [Privacy Policy Guide](https://orbitkit.io/api#privacy-policy) — policy schema and field definitions
- [AASA Guide](https://orbitkit.io/api#aasa) — Universal Links, App Clips, Web Credentials setup
- [Custom Domains](https://orbitkit.io/api#custom-domains) — DNS configuration and SSL provisioning
- [GitHub Action](https://github.com/OrbitKit-io/OrbitKit-Deploy) — deploy from GitHub Actions

## Man Page

A comprehensive man page is included. After installation:

```bash
man orbitkit
```

## License

[Apache License 2.0](LICENSE) © OrbitKit, Inc.
