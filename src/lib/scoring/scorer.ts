import type { ScoringInput, ScoringResult } from "@/lib/types";

/** A scoring backend: takes the listing + comps and returns the §6 result. */
export interface Scorer {
  score(input: ScoringInput): Promise<ScoringResult>;
}
