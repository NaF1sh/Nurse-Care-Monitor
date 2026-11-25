import { describe, expect, it, vi } from "vitest";
import { PredictionBatches } from "@/lib/prediction-batches";
import type { ModelSample, PredictResult } from "@/lib/simulation.functions";

const sample = (ms: number): ModelSample => ({ timestamp: new Date(ms).toISOString(), eda: 1, hr: 80, temp: 36, acc_x: 0, acc_y: 0, acc_z: 1 });
const success: PredictResult = { ok: true, phase: "prediction", state: "ALERT", stress_level: "unknown", high_stress_probability: 0.536512095348628, raw_probability: null, alert_triggered: true, calibration_status: null, out_of_distribution: false };

describe("prediction batch reliability", () => {
  it("sends only new increasing timestamps after acknowledgement", async () => {
    const manager = new PredictionBatches();
    const send = vi.fn().mockResolvedValue(success);
    await manager.send("N-001", [sample(1000), sample(1250)], send);
    await manager.send("N-001", [sample(1000), sample(1250), sample(1500), sample(1500), sample(1400), sample(1750)], send);
    expect(send.mock.calls[1]?.[0].readings.map((r: ModelSample) => r.timestamp)).toEqual([sample(1500).timestamp, sample(1750).timestamp]);
    expect(manager.getProgress("N-001").acknowledgedThrough).toBe(1750);
  });
  it("allows only one outstanding request per nurse and keeps new queued readings", async () => {
    const manager = new PredictionBatches();
    let finish: (r: PredictResult) => void = () => {};
    const transport = vi.fn(() => new Promise<PredictResult>((resolve) => { finish = resolve; }));
    const first = manager.send("N-001", [sample(1000)], transport);
    const queued = [sample(1250)];
    expect(await manager.send("N-001", queued, transport)).toBeNull();
    expect(queued).toHaveLength(1);
    expect(transport).toHaveBeenCalledTimes(1);
    finish(success); await first;
    const second = vi.fn().mockResolvedValue(success);
    await manager.send("N-001", queued, second);
    expect(second.mock.calls[0]?.[0].readings).toEqual([sample(1250)]);
  });
  it("never retries a timeout, persists uncertainty and never acknowledges it", async () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
    const manager = new PredictionBatches(storage);
    const send = vi.fn().mockResolvedValue({ ok: false, reason: "timeout", detail: "Timed out" });
    await manager.send("N-003", [sample(1000)], send);
    await new PredictionBatches(storage).send("N-003", [sample(1250)], send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(manager.getProgress("N-003")).toEqual({ sentThrough: 1000, acknowledgedThrough: 0, uncertain: true });
  });
  it("continues independent nurses when another subject is uncertain", async () => {
    const manager = new PredictionBatches();
    await manager.send("N-001", [sample(1000)], vi.fn().mockRejectedValue(new Error("connection lost")));
    const send = vi.fn().mockResolvedValue(success);
    expect(await manager.send("N-002", [sample(1000)], send)).toEqual(success);
    expect(send).toHaveBeenCalledTimes(1);
  });
});