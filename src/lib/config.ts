/**
 * Centralised, server-side configuration. Reads env once and exposes typed
 * values. Price is config-driven per Build Pack §7 (default $49).
 */

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  reportPriceUsdCents: Number(process.env.REPORT_PRICE_USD_CENTS ?? "4900"),

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

  email: {
    // Resend (https://resend.com). Without a key, sends become logged no-ops
    // so the audit flow never depends on email being configured.
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "OptimoRent <reports@rentlyn.com>",
  },
} as const;

export { required };
