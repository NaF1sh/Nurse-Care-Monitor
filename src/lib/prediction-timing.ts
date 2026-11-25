import type { PredictResult } from "./simulation.functions";

export interface InferenceTiming {
  calibration_seconds_remaining: number | null;
  window_samples_collected: number | null;
  window_samples_needed: number | null;
}

export interface TimingSnapshot {
  result: PredictResult;
  acceptedThrough: number;
}

export interface PredictionClockInput {
  now: number;
  running: boolean;
  pending: boolean;
  uncertain: boolean;
  modelReady: boolean;
  nextBatchAt: number | null;
  batchIntervalMs: number;
  latestSampleAt: number | null;
  queuedSamples: number;
  sampleRateHz: number | null;
  snapshot?: TimingSnapshot | undefined;
}

export interface PredictionClock {
  phase: "paused" | "request" | "error" | "waiting" | "calibration" | "window" | "ready";
  label: string;
  seconds: number | null;
  detail?: string | undefined;
}

export function formatPredictionTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

/** Estimates readiness for dispatch, never the time a remote result will arrive. */
export function predictionClock(input: PredictionClockInput): PredictionClock {
  if (input.pending) return { phase: "request", label: "Prediction in progress", seconds: null };
  if (input.uncertain) return { phase: "error", label: "Outcome uncertain — requests paused", seconds: null };
  const result = input.snapshot?.result;
  if (result && !result.ok) return { phase: "error", label: result.reason === "timeout" ? "API timeout" : "API error", seconds: null, detail: result.detail ?? undefined };
  if (!input.running) return { phase: "paused", label: "Simulation paused", seconds: null };
  if (!input.modelReady) return { phase: "waiting", label: "Waiting for model", seconds: null };
  if (input.latestSampleAt == null || input.now - input.latestSampleAt > 2000) return { phase: "waiting", label: "Waiting for sensor samples", seconds: null };
  if (!result?.ok || !input.snapshot) return { phase: "waiting", label: "Awaiting API timing", seconds: null };
  const timing = result.timing;
  if (result.calibration_status === "calibrating") {
    if (timing?.calibration_seconds_remaining == null) return { phase: "waiting", label: "Calibration timing unavailable", seconds: null };
    // Calibration in the engine uses sensor timestamp elapsed time, not wall-clock/API latency.
    const elapsed = Math.max(0, input.latestSampleAt - input.snapshot.acceptedThrough) / 1000;
    const remaining = Math.max(0, timing.calibration_seconds_remaining - elapsed);
    return remaining > 0
      ? { phase: "calibration", label: "Calibration remaining (est.)", seconds: Math.ceil(remaining), detail: `Last API acknowledgement: ${formatPredictionTime(timing.calibration_seconds_remaining)} remaining` }
      : { phase: "waiting", label: "Awaiting calibration confirmation", seconds: null };
  }
  if (input.nextBatchAt == null || input.nextBatchAt <= input.now) return { phase: "waiting", label: "Batch delayed — waiting for dispatch", seconds: null };
  if (result.calibration_status === "collecting_window") {
    if (timing?.window_samples_collected == null || timing.window_samples_needed == null || !input.sampleRateHz) return { phase: "waiting", label: "Window timing unavailable", seconds: null };
    // Count actual queued samples: a sleeping tab cannot collect samples by merely letting time pass.
    const missing = Math.max(0, timing.window_samples_needed - timing.window_samples_collected - input.queuedSamples);
    const collectionMs = missing / input.sampleRateHz * 1000;
    const cycles = Math.max(0, Math.ceil((input.now + collectionMs - input.nextBatchAt) / input.batchIntervalMs));
    const dueAt = input.nextBatchAt + cycles * input.batchIntervalMs;
    return { phase: "window", label: "Window ready / next batch (est.)", seconds: Math.ceil((dueAt - input.now) / 1000), detail: `${timing.window_samples_collected} accepted + ${input.queuedSamples} queued / ${timing.window_samples_needed} samples` };
  }
  if (result.calibration_status !== "active" || result.phase !== "prediction") return { phase: "waiting", label: "Awaiting API timing", seconds: null };
  // Active engine predicts on every new sample in its rolling window; website delivers batches.
  if (!input.queuedSamples && !input.sampleRateHz) return { phase: "waiting", label: "Waiting for sensor samples", seconds: null };
  return { phase: "ready", label: "Next prediction batch (est.)", seconds: Math.ceil((input.nextBatchAt - input.now) / 1000) };
}
/** Plain state name shown beside each countdown. */
export function clockState(phase: PredictionClock["phase"]): string {
  return { calibration: "CALIBRATING", window: "COLLECTING DATA", request: "PROCESSING", ready: "PREDICTION READY", error: "API ERROR", waiting: "WAITING", paused: "PAUSED" }[phase];
}
