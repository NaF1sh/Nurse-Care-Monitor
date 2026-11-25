// Synthetic sensor generator for the Live Nurse Stress Simulation (demo only).
// These nurses and readings never touch the real database — they exist only
// in the browser while the simulation page is open.

export interface SimNurse {
  code: string;
  name: string;
  ward: string;
  hrBase: number;
  tempBase: number;
  edaBase: number;
}

export const SIM_NURSES: SimNurse[] = [
  { code: "N-001", name: "Demo Nurse Ayesha", ward: "ICU", hrBase: 74, tempBase: 36.6, edaBase: 4.5 },
  { code: "N-002", name: "Demo Nurse Rahim", ward: "Emergency", hrBase: 68, tempBase: 36.4, edaBase: 3.1 },
  { code: "N-003", name: "Demo Nurse Fatema", ward: "Pediatrics", hrBase: 70, tempBase: 36.5, edaBase: 3.8 },
  { code: "N-004", name: "Demo Nurse Karim", ward: "Surgery", hrBase: 76, tempBase: 36.7, edaBase: 5.0 },
  { code: "N-005", name: "Demo Nurse Salma", ward: "General", hrBase: 66, tempBase: 36.3, edaBase: 2.7 },
];

export interface SimReading {
  nurse_code: string;
  recorded_at: string;
  heart_rate: number;
  skin_temperature: number;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  eda: number;
}

interface NurseState {
  hr: number;
  temp: number;
  eda: number;
  spikeLeft: number; // remaining cycles of an elevated spike
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, d: number) => Number(v.toFixed(d));

/** Stateful simulator: smooth random walk with mean reversion + occasional short spikes. */
export function createSimulator(nurses: SimNurse[] = SIM_NURSES) {
  const state = new Map<string, NurseState>(
    nurses.map((n) => [n.code, { hr: n.hrBase, temp: n.tempBase, eda: n.edaBase, spikeLeft: 0 }]),
  );

  function next(): SimReading[] {
    const now = new Date().toISOString();
    return nurses.map((n) => {
      const s = state.get(n.code);
      if (!s) throw new Error("Missing simulation nurse state");

      // Occasionally start a short-lived spike (2–4 cycles), e.g. a rush episode.
      if (s.spikeLeft === 0 && Math.random() < 0.06) s.spikeLeft = 2 + Math.floor(Math.random() * 3);
      const spiking = s.spikeLeft > 0;
      if (spiking) s.spikeLeft -= 1;

      // Mean-reverting random walk; spikes push values up while active.
      s.hr += (n.hrBase - s.hr) * 0.15 + rand(-3, 3) + (spiking ? rand(6, 14) : 0);
      s.temp += (n.tempBase - s.temp) * 0.1 + rand(-0.08, 0.08) + (spiking ? rand(0, 0.15) : 0);
      s.eda += (n.edaBase - s.eda) * 0.12 + rand(-0.3, 0.3) + (spiking ? rand(0.5, 1.6) : 0);

      const hr = clamp(s.hr, 45, 170);
      const temp = clamp(s.temp, 35.0, 39.5);
      const eda = clamp(s.eda, 0.5, 20);
      s.hr = hr; s.temp = temp; s.eda = eda;

      // Movement: calm baseline with random bursts while spiking.
      const move = spiking ? rand(0.4, 1.4) : rand(0.05, 0.5);
      return {
        nurse_code: n.code,
        recorded_at: now,
        heart_rate: round(hr, 1),
        skin_temperature: round(temp, 2),
        accel_x: round(rand(-move, move), 3),
        accel_y: round(rand(-move, move), 3),
        accel_z: round(1 + rand(-move, move), 3),
        eda: round(eda, 2),
      };
    });
  }

  return { next };
}

export const SAMPLE_INTERVAL_MS = 250; // ~4 Hz, what the model was trained on

export interface ModelSampleOut {
  timestamp: string;
  eda: number;
  hr: number;
  temp: number;
  acc_x: number;
  acc_y: number;
  acc_z: number;
}

/**
 * 4 Hz sample from the current 30-second anchor reading: small physiological
 * jitter around the anchor so the model receives a real high-rate stream.
 */
export function sampleAround(anchor: SimReading, at: Date = new Date()): ModelSampleOut {
  return {
    timestamp: at.toISOString(),
    eda: round(clamp(anchor.eda + rand(-0.05, 0.05), 0.5, 20), 3),
    hr: round(clamp(anchor.heart_rate + rand(-1.5, 1.5), 45, 170), 1),
    temp: round(clamp(anchor.skin_temperature + rand(-0.02, 0.02), 35, 39.5), 3),
    acc_x: round(anchor.accel_x + rand(-0.08, 0.08), 3),
    acc_y: round(anchor.accel_y + rand(-0.08, 0.08), 3),
    acc_z: round(anchor.accel_z + rand(-0.08, 0.08), 3),
  };
}

export const SHOWCASE_NURSES = SIM_NURSES.slice(0, 3);
/** Calibration length comes only from the model's own Health/reset reply; null when it was not reported. */
export function calibrationMsFromModel(minutes: number | null | undefined): number | null {
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60_000) : null;
}
export const PREDICTION_WINDOW_SECONDS = 60;

/** Input profiles, not diagnoses. Only the remote engine can determine stress. */
export function showcaseSample(nurse: SimNurse, at: Date, startedAt: number, elevatedAt: number | null): ModelSampleOut {
  const t = Math.max(0, (at.getTime() - startedAt) / 1000);
  const phase = nurse.code === "N-002" ? 1.3 : nurse.code === "N-003" ? 2.7 : 0;
  const elevated = nurse.code !== "N-003" && elevatedAt != null;
  // A gradual 60-second transition avoids abrupt jumps in slope/difference features.
  const ramp = elevated ? clamp((at.getTime() - elevatedAt) / 60_000, 0, 1) : 0;
  const wave = (period: number) => Math.sin(2 * Math.PI * t / period + phase);
  const scrAge = (t + phase) % (ramp > 0 ? 12 : 35);
  const scr = (1 - Math.exp(-scrAge / 0.8)) * Math.exp(-scrAge / 3);
  const movement = 0.045 + 0.055 * ramp;
  return {
    timestamp: at.toISOString(),
    hr: round(nurse.hrBase + 22 * ramp + (2.4 - 0.8 * ramp) * wave(6) + 2 * wave(47), 2),
    eda: round(nurse.edaBase + 2.2 * ramp + 0.18 * wave(65) + (0.18 + 0.65 * ramp) * scr, 3),
    // Peripheral skin temperature, not core temperature; modest cooling under arousal.
    temp: round(nurse.tempBase - 0.35 * ramp + 0.07 * wave(120), 3),
    acc_x: round(movement * wave(2.3) + 0.025 * wave(31), 3),
    acc_y: round(movement * wave(3.1) + 0.02 * wave(43), 3),
    acc_z: round(1 + movement * 0.6 * wave(2.7) + 0.025 * wave(29), 3),
  };
}

export function showcaseMayElevate(startedAt: number, acceptedThrough: number, calibrationStatus: string | null, calibrationMs: number | null): boolean {
  return calibrationMs != null && acceptedThrough - startedAt >= calibrationMs && (calibrationStatus === "collecting_window" || calibrationStatus === "active");
}

export function sampleToReading(code: string, s: ModelSampleOut): SimReading {
  return { nurse_code: code, recorded_at: s.timestamp, heart_rate: s.hr, eda: s.eda, skin_temperature: s.temp, accel_x: s.acc_x, accel_y: s.acc_y, accel_z: s.acc_z };
}
