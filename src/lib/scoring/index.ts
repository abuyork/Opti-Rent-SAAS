import { config } from "@/lib/config";
import type { Scorer } from "./scorer";
import { MockScorer } from "./mock";
import { ClaudeScorer } from "./live";

export type { Scorer } from "./scorer";
export { ScoringParseError } from "./validate";

let cached: Scorer | null = null;

/** Returns the configured scorer (mock or live Claude), memoised per process. */
export function getScorer(): Scorer {
  if (cached) return cached;
  cached = config.claude.mode === "live" ? new ClaudeScorer() : new MockScorer();
  return cached;
}
