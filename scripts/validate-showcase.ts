// Run with bun scripts/validate-showcase.ts <output-directory>. No resets, no database writes.
import { mkdir, appendFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { callGradio, requestGradioPrediction, validatePredictInput } from "../src/lib/simulation.functions";
import { showcaseSample, SIM_NURSES } from "../src/lib/simulation";
import { validationMayElevate } from "../src/lib/showcase-validation";

const output = process.argv[2];
if (!output) throw new Error("Provide an output directory");
await mkdir(output, { recursive: true });
const nurse = SIM_NURSES[0];
if (!nurse) throw new Error("Missing baseline profile");
const prefix = `V-${randomUUID().slice(0, 8)}`;
const subjects = [1, 2, 3].map(i => ({ id: `${prefix}-${i}`, elevated: i !== 3, paused: false, accepted: 0, calibration: null as string | null }));
const health = await callGradio("health", []);
if (!health.ok || !health.value || typeof health.value !== "object" || !("model_loaded" in health.value) || health.value.model_loaded !== true) throw new Error("Actual model not ready");
const started = Date.now();
await writeFile(`${output}/manifest.json`, JSON.stringify({ started_at: new Date(started).toISOString(), subjects, health: health.value, sample_interval_ms: 250, batch_samples: 120, baseline_seconds: 540, total_seconds: 960, input_profile: nurse, ramp_seconds: 60 }, null, 2));
let elevatedAt: number | null = null;
for (let batch = 0; batch < 32; batch++) {
  const deadline = started + (batch + 1) * 30000;
  await new Promise(resolve => setTimeout(resolve, Math.max(0, deadline - Date.now())));
  if (elevatedAt == null && validationMayElevate(batch * 30000, subjects)) elevatedAt = started + batch * 30000;
  for (const subject of subjects) {
    if (subject.paused) continue;
    const readings = Array.from({ length: 120 }, (_, i) => showcaseSample(nurse, new Date(started + (batch * 120 + i) * 250), started, subject.elevated ? elevatedAt : null));
    // All subjects use the exact same waveform phase and baseline, including control.
    const data = validatePredictInput({ subject_id: subject.id, readings });
    const result = await requestGradioPrediction(data);
    const received = result.diagnostic?.samples_received;
    if (result.ok && result.diagnostic?.returned_subject_id === subject.id && received === readings.length) {
      subject.accepted += received;
      subject.calibration = result.calibration_status;
    } else {
      // No blind retries or continuation after an uncertain/invalid acknowledgement.
      subject.paused = true;
    }
    await appendFile(`${output}/results.jsonl`, JSON.stringify({ batch: batch + 1, profile: subject.elevated && elevatedAt != null ? "elevated" : "baseline", cumulative_accepted: subject.accepted, subject_id: subject.id, ...result }) + "\n");
    await appendFile(`${output}/inputs.jsonl`, readings.map(r => JSON.stringify({ subject_id: subject.id, profile: subject.elevated && elevatedAt != null ? "elevated" : "baseline", ...r })).join("\n") + "\n");
  }
  await writeFile(`${output}/progress.json`, JSON.stringify({ batch: batch + 1, elevated_at: elevatedAt == null ? null : new Date(elevatedAt).toISOString(), subjects, finished: batch === 31 || subjects.every(s => s.paused) }, null, 2));
  if (subjects.every(s => s.paused)) break;
}