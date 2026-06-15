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

  airroi: {
    mode: (process.env.AIRROI_MODE ?? "mock") as "mock" | "live",
    apiKey: process.env.AIRROI_API_KEY ?? "",
    baseUrl: process.env.AIRROI_BASE_URL ?? "https://api.airroi.com",
  },

  claude: {
    mode: (process.env.CLAUDE_MODE ?? "mock") as "mock" | "live",
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
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
} as const;

export { required };
