/**
 * Centralised, server-side configuration. Reads env once and exposes typed
 * values. Price is config-driven per Build Pack §7 (default $49).
 */

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  /**
   * Public origin used to build every user-facing absolute URL (checkout
   * redirects, unlock links, email links). Netlify provides URL /
   * DEPLOY_PRIME_URL, so production can never fall back to localhost —
   * that exact fallback shipped: with NEXT_PUBLIC_APP_URL unset in Netlify,
   * the live buy button redirected buyers to http://localhost:3000
   * (manager report 2026-08-05). Set NEXT_PUBLIC_APP_URL=https://optimo.rent
   * in Netlify to prefer the branded domain over the *.netlify.app one.
   */
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    "http://localhost:3000",

  reportPriceUsdCents: Number(process.env.REPORT_PRICE_USD_CENTS ?? "4900"),

  /** One market playbook PDF. Sold per location, separate from the audit. */
  playbookPriceUsdCents: Number(process.env.PLAYBOOK_PRICE_USD_CENTS ?? "2900"),

  reportLinkSecret: process.env.REPORT_LINK_SECRET ?? "dev-insecure-secret",

  // TESTING ONLY: when true, the result screen reveals the full report (fixes +
  // rewrites) without payment. Set via OPTIRENT_TESTING_UNLOCK_ALL=true in
  // .env.local for local QA. Defaults false so production stays paywalled.
  testingShowFullReport: process.env.OPTIRENT_TESTING_UNLOCK_ALL === "true",

  airroi: {
    mode: (process.env.AIRROI_MODE ?? "mock") as "mock" | "live",
    apiKey: process.env.AIRROI_API_KEY ?? "",
    baseUrl: process.env.AIRROI_BASE_URL ?? "https://api.airroi.com",
  },

  claude: {
    mode: (process.env.CLAUDE_MODE ?? "mock") as "mock" | "live",
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
    // Vision: send the first N listing photos to Claude as images so it can
    // judge the actual cover shot (the highest-leverage lever). Costs roughly
    // 1.5–4.8k tokens per image — lower the count or disable to control spend.
    vision: (process.env.OPTIRENT_VISION ?? "true") === "true",
    visionMaxImages: Number(process.env.OPTIRENT_VISION_MAX_IMAGES ?? "6"),
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  },

  /**
   * Free-audit cost controls (each audit spends ~$0.55 of AirROI + Claude).
   * Reuse: a listing scored within the window is served from the stored
   * result instead of re-paying both APIs. Caps: per-day creation limits
   * counted in the DB (serverless-safe). IP cap is looser than the email cap
   * because Bali coworking/CGNAT puts many owners behind one address.
   */
  limits: {
    auditReuseHours: Number(process.env.OPTIRENT_AUDIT_REUSE_HOURS ?? "24"),
    auditsPerEmailPerDay: Number(process.env.OPTIRENT_AUDIT_EMAIL_DAILY_LIMIT ?? "5"),
    auditsPerIpPerDay: Number(process.env.OPTIRENT_AUDIT_IP_DAILY_LIMIT ?? "10"),
  },

  email: {
    // Resend (https://resend.com). Without a key, sends become logged no-ops
    // so the audit flow never depends on email being configured.
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "OptimoRent <reports@rentlyn.com>",
    // Public contact address shown in footers and sent emails. Separate from
    // `from`: this is where owners write to us, not the sender we send as.
    contact: process.env.CONTACT_EMAIL ?? "hi@optimo.rent",
  },
} as const;

export { required };
