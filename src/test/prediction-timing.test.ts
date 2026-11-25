import { describe, expect, it } from "vitest";
import { formatPredictionTime, predictionClock, type PredictionClockInput } from "@/lib/prediction-timing";
import { parsePredictResponse } from "@/lib/simulation.functions";

const result = (status: string, details: unknown = {}) => parsePredictResponse({ state: status === "active" ? "NORMAL" : "PENDING", calibration_status: status, details });
const base: PredictionClockInput = { now: 100_000, running: true, pending: false, uncertain: false, modelReady: true, nextBatchAt: 120_000, batchIntervalMs: 30_000, latestSampleAt: 100_000, queuedSamples: 40, sampleRateHz: 4 };

describe("actual prediction readiness", () => {
  it("uses actual calibration seconds and sensor timestamps, not API latency", () => {
    const snapshot = { result: result("calibrating", { seconds_remaining: 450 }), acceptedThrough: 90_000 };
    expect(predictionClock({ ...base, snapshot })).toMatchObject({ phase: "calibration", seconds: 440 });
    expect(predictionClock({ ...base, now: 101_000, latestSampleAt: 101_000, snapshot }).seconds).toBe(439);
  });
  it("requires the actual 240 samples for a 60-second / 4 Hz window and rounds to the 30-second batch", () => {
    const snapshot = { result: result("collecting_window", { samples_collected: 120, samples_needed: 240 }), acceptedThrough: 90_000 };
    expect(predictionClock({ ...base, snapshot })).toMatchObject({ phase: "window", seconds: 20 });
    expect(predictionClock({ ...base, queuedSamples: 0, snapshot }).seconds).toBe(50);
  });
  it("shows a running request instead of zero or a result-arrival estimate", () => {
    expect(predictionClock({ ...base, pending: true, uncertain: true })).toMatchObject({ phase: "request", seconds: null });
  });
  it("after actual active success uses the scheduled dispatch, not completion plus 30 seconds", () => {
    const snapshot = { result: result("active"), acceptedThrough: 90_000 };
    expect(predictionClock({ ...base, snapshot })).toMatchObject({ phase: "ready", seconds: 20 });
  });
  it("never gives a success countdown after API failure or timeout", () => {
    expect(predictionClock({ ...base, snapshot: { result: { ok: false, reason: "timeout", detail: "Timed out" }, acceptedThrough: 90_000 } })).toMatchObject({ phase: "error", seconds: null });
    expect(predictionClock({ ...base, uncertain: true })).toMatchObject({ phase: "error", seconds: null });
  });
  it("does not count a sleeping tab as collected samples or show a negative overdue countdown", () => {
    const snapshot = { result: result("active"), acceptedThrough: 90_000 };
    expect(predictionClock({ ...base, now: 150_000, snapshot })).toMatchObject({ phase: "waiting", seconds: null });
    expect(predictionClock({ ...base, now: 150_000, latestSampleAt: 150_000, snapshot })).toMatchObject({ phase: "waiting", seconds: null });
  });
  it("does not infer remote calibration on reload or when provider details are absent", () => {
    expect(predictionClock(base).seconds).toBeNull();
    expect(predictionClock({ ...base, snapshot: { result: result("calibrating"), acceptedThrough: 90_000 } }).seconds).toBeNull();
  });
  it("requires confirmation at calibration zero and pauses on stop", () => {
    const snapshot = { result: result("calibrating", { seconds_remaining: 5 }), acceptedThrough: 90_000 };
    expect(predictionClock({ ...base, snapshot })).toMatchObject({ phase: "waiting", seconds: null });
    expect(predictionClock({ ...base, running: false, snapshot })).toMatchObject({ phase: "paused", seconds: null });
  });
  it("exposes only bounded real timing fields, never fabricated defaults or raw details", () => {
    expect(result("collecting_window", { samples_collected: 120, samples_needed: 240, secret: "not forwarded" })).toMatchObject({ timing: { calibration_seconds_remaining: null, window_samples_collected: 120, window_samples_needed: 240 } });
    expect(result("calibrating", { seconds_remaining: -1, samples_collected: 1.5, samples_needed: Infinity })).toMatchObject({ timing: { calibration_seconds_remaining: null, window_samples_collected: null, window_samples_needed: null } });
  });
  it("formats nonnegative MM:SS", () => {
    expect(formatPredictionTime(450)).toBe("07:30");
    expect(formatPredictionTime(-1)).toBe("00:00");
    expect(formatPredictionTime(59.2)).toBe("01:00");
  });
});