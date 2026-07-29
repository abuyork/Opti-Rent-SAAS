import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import type { PlaybookDef } from "@/lib/playbooks";

/**
 * Playbook PDF delivery. The books live in a PRIVATE Supabase Storage bucket
 * (`playbooks`), so the only way to reach one is a short-lived signed URL
 * minted here with the service-role key — server-side only. A buyer never gets
 * a durable link, and a non-buyer has no URL to guess.
 */
const BUCKET = "playbooks";

/** Signed URL lifetime. Long enough to click through, short enough not to share. */
const EXPIRES_SECONDS = 15 * 60;

export function playbookStorageReady(): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

export async function signedPlaybookUrl(playbook: PlaybookDef): Promise<string> {
  if (!playbookStorageReady()) {
    throw new Error("Supabase storage is not configured; cannot serve playbooks.");
  }
  const db = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(playbook.file, EXPIRES_SECONDS, { download: playbook.file });

  if (error || !data?.signedUrl) {
    throw new Error(`Could not sign ${playbook.file}: ${error?.message ?? "no URL returned"}`);
  }
  return data.signedUrl;
}
