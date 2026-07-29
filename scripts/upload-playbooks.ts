/**
 * Publish the playbook PDFs to the private `playbooks` Supabase bucket.
 *
 *   npm run playbooks:upload            # all three
 *   npm run playbooks:upload -- bali    # just one
 *
 * Run this after rebuilding a book in docs/playbook-src, otherwise buyers keep
 * downloading the previous edition. Reads the PDFs from docs/, which is not in
 * git — this is a local publish step, not part of the deploy.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Uses the Storage REST API rather than `@supabase/supabase-js`: the client's
 * realtime module hard-fails on Node 20 outside Next ("no native WebSocket
 * support"), and an upload needs none of it.
 */
const BUCKET = "playbooks";

function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined)
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const { PLAYBOOKS, PLAYBOOK_KEYS, isPlaybookKey } = await import("@/lib/playbooks");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");

  const asked = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  for (const a of asked) {
    if (!isPlaybookKey(a)) throw new Error(`Unknown playbook "${a}".`);
  }
  const keys = asked.length ? asked : PLAYBOOK_KEYS;

  const base = url.replace(/\/$/, "");
  for (const k of keys) {
    const book = PLAYBOOKS[k as keyof typeof PLAYBOOKS];
    const body = readFileSync(resolve(process.cwd(), "docs", book.file));
    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${book.file}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
      },
      body,
    });
    if (!res.ok) throw new Error(`${book.file}: HTTP ${res.status} ${await res.text()}`);
    console.log(`uploaded ${book.file} (${(body.length / 1e6).toFixed(1)} MB)`);
  }
  console.log(`\ndone — ${keys.length} playbook(s) published to ${BUCKET}/`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
