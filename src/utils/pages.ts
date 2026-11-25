/**
 * Rendered site pages (preview, deploy history, policy versions): a map of
 * page key → whole HTML document. Printed as a size list, or written out.
 */

import * as fs from "fs";
import * as path from "path";
import { printData, printSuccess } from "./output";

/** Write each page to <dir>/<key>.html, or list the pages and their sizes. */
export function outputPages(pages: Record<string, string> | null | undefined, out: string | undefined, json: boolean): void {
  const all = pages ?? {};
  if (!out) {
    printData(
      Object.entries(all).map(([page, html]) => ({ Page: page, Size: `${html.length} chars` })),
      json
    );
    return;
  }
  fs.mkdirSync(out, { recursive: true });
  for (const [page, html] of Object.entries(all)) {
    // Page keys are server-chosen; keep them to a safe file name.
    const file = path.join(out, `${page.replace(/[^A-Za-z0-9_-]/g, "_")}.html`);
    fs.writeFileSync(file, html);
  }
  printSuccess(`Wrote ${Object.keys(all).length} pages to ${out}`);
}

/**
 * `[appId] <second>` arguments: with one argument it is the second one and
 * the app ID comes from ORBITKIT_APP_ID.
 */
export function appAndArg(first: string | undefined, second: string | undefined): [string | undefined, string | undefined] {
  return second === undefined ? [undefined, first] : [first, second];
}
