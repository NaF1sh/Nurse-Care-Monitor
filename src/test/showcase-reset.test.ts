import { describe, expect, it } from "vitest";
import { parseResetReply } from "@/lib/simulation.functions";
import { PredictionBatches } from "@/lib/prediction-batches";

describe("showcase new-start reset", () => {
  it("accepts only a confirmed reset for the same nurse", () => {
    expect(parseResetReply("N-001", { success: true, subject_id: "N-001", calibration_minutes: 1.0, expected_first_prediction_seconds: 120 })).toEqual({ ok: true, subject_id: "N-001", calibration_minutes: 1, expected_first_prediction_seconds: 120 });
    expect(parseResetReply("N-001", { success: true, subject_id: "N-002" })).toMatchObject({ ok: false });
    expect(parseResetReply("N-001", { success: false, error: "boom" })).toMatchObject({ ok: false, detail: "boom" });
  });
  it("clears a paused nurse only after a confirmed reset and never replays old samples", async () => {
    const b = new PredictionBatches();
    await b.send("N-001", [{ timestamp: new Date(1000).toISOString(), eda: 1, hr: 70, temp: 33, acc_x: 0, acc_y: 0, acc_z: 1 }], async () => ({ ok: false, reason: "timeout", detail: null }));
    expect(b.getProgress("N-001").uncertain).toBe(true);
    expect(b.confirmRemoteReset("N-001")).toBe(true);
    expect(b.getProgress("N-001")).toEqual({ sentThrough: 1000, acknowledgedThrough: 1000, uncertain: false });
    const old = [{ timestamp: new Date(1000).toISOString(), eda: 1, hr: 70, temp: 33, acc_x: 0, acc_y: 0, acc_z: 1 }];
    expect(await b.send("N-001", old, async () => { throw new Error("must not send"); })).toBeNull();
  });
});
