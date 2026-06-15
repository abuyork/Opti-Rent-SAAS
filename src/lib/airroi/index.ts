import { config } from "@/lib/config";
import type { AirRoiProvider } from "./provider";
import { MockAirRoiProvider } from "./mock";
import { LiveAirRoiProvider } from "./live";

export type { AirRoiProvider } from "./provider";
export { AirRoiError } from "./provider";

let cached: AirRoiProvider | null = null;

/** Returns the configured AirROI provider (mock or live), memoised per process. */
export function getAirRoiProvider(): AirRoiProvider {
  if (cached) return cached;
  cached =
    config.airroi.mode === "live"
      ? new LiveAirRoiProvider()
      : new MockAirRoiProvider();
  return cached;
}
