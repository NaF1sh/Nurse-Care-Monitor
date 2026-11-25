import { describe, expect, it } from "vitest";
import { isStale, STALE_MINUTES } from "@/lib/store";

describe("stale data rule", () => {
  it("threshold is 30 minutes", () => expect(STALE_MINUTES).toBe(30));
  it("29 minutes old is current", () => expect(isStale(new Date(Date.now() - 29 * 60_000).toISOString())).toBe(false));
  it("31 minutes old is stale", () => expect(isStale(new Date(Date.now() - 31 * 60_000).toISOString())).toBe(true));
  it("missing timestamp is stale", () => expect(isStale(null)).toBe(true));
});
