import Anthropic from "@anthropic-ai/sdk";
import type { ScoringInput, ScoringResult } from "@/lib/types";
import { config } from "@/lib/config";
import type { Scorer } from "./scorer";
import { SCORING_SYSTEM_PROMPT } from "./prompt";
import { extractJson, validateScoringResult, ScoringParseError } from "./validate";

/**
 * Live scorer backed by the Claude API. Sends the §6 system prompt + the
 * listing/comps as the user message JSON, parses defensively, and retries once
 * on malformed JSON (Build Pack §6).
 */
export class ClaudeScorer implements Scorer {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    if (!config.claude.apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set but CLAUDE_MODE=live. Set the key or use mock mode.",
      );
    }
    this.client = new Anthropic({ apiKey: config.claude.apiKey });
    this.model = config.claude.model;
  }

  async score(input: ScoringInput): Promise<ScoringResult> {
    const userMessage = JSON.stringify(input);

    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.call(userMessage, attempt > 0);
      try {
        const result = validateScoringResult(extractJson(raw));
        // underpricing is deterministic; reconcile to the canonical formula so
        // the displayed figure always matches benchmark − rate (Build Pack §4.4).
        result.underpricing_idr = Math.max(
          0,
          input.comps.benchmark_nightly_rate - input.listing.nightly_rate,
        );
        return result;
      } catch (e) {
        if (!(e instanceof ScoringParseError)) throw e;
        lastErr = e;
      }
    }
    throw new ScoringParseError(
      `Claude returned malformed JSON twice: ${(lastErr as Error)?.message ?? "unknown"}`,
    );
  }

  private async call(userMessage: string, isRetry: boolean): Promise<string> {
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: 0,
      system: isRetry
        ? `${SCORING_SYSTEM_PROMPT}\n\nYour previous reply was not valid JSON. Return ONLY the JSON object, no prose or backticks.`
        : SCORING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
}
