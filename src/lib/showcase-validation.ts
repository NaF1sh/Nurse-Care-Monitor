import { showcaseSample, SIM_NURSES } from "./simulation";

export const VALIDATION_BASELINE_MS = 540_000;
export const VALIDATION_TOTAL_BATCHES = 32;
export const VALIDATION_BATCH_SAMPLES = 120;

export function validationMayElevate(elapsed: number, subjects: { calibration: string | null; accepted: number; paused: boolean }[]) {
  return elapsed >= VALIDATION_BASELINE_MS && subjects.length === 3 && subjects.every(s => s.calibration === "active" && s.accepted >= 2160 && !s.paused);
}

export function validationSample(at: Date, startedAt: number, elevatedAt: number | null, elevated: boolean) {
  const baseline = SIM_NURSES[0];
  if (!baseline) throw new Error("Missing validation baseline");
  return showcaseSample(baseline, at, startedAt, elevated ? elevatedAt : null);
}