import { describe, expect, it } from "vitest";
import { validationMayElevate, validationSample, VALIDATION_BATCH_SAMPLES } from "@/lib/showcase-validation";
import { SAMPLE_INTERVAL_MS } from "@/lib/simulation";

describe("isolated validation rules", () => {
  it("gives all three subjects identical baseline samples", () => {
    const at = new Date(300000);
    expect(validationSample(at, 0, null, true)).toEqual(validationSample(at, 0, null, false));
  });
  it("keeps the control unchanged after elevation", () => {
    const at = new Date(700000);
    expect(validationSample(at, 0, 540000, false)).toEqual(validationSample(at, 0, null, false));
    expect(validationSample(at, 0, 540000, true).hr).toBeGreaterThan(validationSample(at, 0, null, false).hr + 20);
  });
  it("requires real active calibration and acknowledged baseline from all three", () => {
    const ready = Array.from({length:3}, () => ({calibration:"active", accepted:2160, paused:false}));
    expect(validationMayElevate(539999, ready)).toBe(false);
    expect(validationMayElevate(540000, ready)).toBe(true);
    expect(validationMayElevate(540000, [...ready.slice(0,2), {calibration:"calibrating", accepted:2160, paused:false}])).toBe(false);
    expect(validationMayElevate(540000, [...ready.slice(0,2), {calibration:"active", accepted:2040, paused:false}])).toBe(false);
  });
  it("preserves 4 Hz and 30-second batches", () => {
    expect(SAMPLE_INTERVAL_MS).toBe(250);
    expect(VALIDATION_BATCH_SAMPLES).toBe(120);
    expect(VALIDATION_BATCH_SAMPLES * SAMPLE_INTERVAL_MS).toBe(30000);
  });
});