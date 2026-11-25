import { describe, expect, it } from "vitest";
import { createSimulator, SIM_NURSES, SHOWCASE_NURSES, calibrationMsFromModel, PREDICTION_WINDOW_SECONDS, showcaseSample, showcaseMayElevate } from "@/lib/simulation";

describe("live simulation generator", () => {
  it("has exactly five demo nurses with stable IDs N-001..N-005", () => {
    expect(SIM_NURSES.map((n) => n.code)).toEqual(["N-001", "N-002", "N-003", "N-004", "N-005"]);
  });

  it("generates one reading per nurse with plausible sensor values", () => {
    const sim = createSimulator();
    for (let cycle = 0; cycle < 20; cycle++) {
      const batch = sim.next();
      expect(batch).toHaveLength(5);
      for (const r of batch) {
        expect(r.heart_rate).toBeGreaterThanOrEqual(45);
        expect(r.heart_rate).toBeLessThanOrEqual(170);
        expect(r.skin_temperature).toBeGreaterThanOrEqual(35);
        expect(r.skin_temperature).toBeLessThanOrEqual(39.5);
        expect(r.eda).toBeGreaterThanOrEqual(0.5);
        expect(r.eda).toBeLessThanOrEqual(20);
        expect(Number.isFinite(r.accel_x)).toBe(true);
        expect(Number.isFinite(r.accel_y)).toBe(true);
        expect(Number.isFinite(r.accel_z)).toBe(true);
        expect(r.recorded_at).toBeTruthy();
      }
    }
  });

  it("readings vary over time and carry no stress label", () => {
    const sim = createSimulator();
    const first = sim.next();
    const second = sim.next();
    expect(first.some((r, i) => r.heart_rate !== second[i]?.heart_rate)).toBe(true);
    for (const r of sim.next()) expect("stress_level" in r).toBe(false);
  });
});

describe("three-nurse showcase input rules", () => {
  it("shows N-001 through N-003 and preserves N-004/N-005 in standard", () => {
    expect(SHOWCASE_NURSES.map(n => n.code)).toEqual(["N-001", "N-002", "N-003"]);
    expect(SIM_NURSES.slice(3).map(n => n.code)).toEqual(["N-004", "N-005"]);
  });
  it("uses the model-reported 1-minute calibration and actual completed calibration", () => {
    const cal = calibrationMsFromModel(1.0);
    expect(cal).toBe(60000);
    expect(calibrationMsFromModel(null)).toBeNull();
    expect(showcaseMayElevate(0, 59999, "active", cal)).toBe(false);
    expect(showcaseMayElevate(0, 60000, "calibrating", cal)).toBe(false);
    expect(showcaseMayElevate(0, 60000, "collecting_window", cal)).toBe(true);
    expect(showcaseMayElevate(0, 600000, "active", null)).toBe(false);
    expect(PREDICTION_WINDOW_SECONDS).toBe(60);
  });
  it("keeps baseline inputs until calibration and elevates only N-001/N-002 gradually", () => {
    for (const n of SHOWCASE_NURSES) {
      const baseline = showcaseSample(n, new Date(600000), 0, null);
      const elevated = showcaseSample(n, new Date(600000), 0, 450000);
      if (n.code === "N-003") expect(elevated).toEqual(baseline);
      else { expect(elevated.hr - baseline.hr).toBeGreaterThan(20); expect(elevated.eda).toBeGreaterThan(baseline.eda + 2); expect(elevated.temp).toBeLessThan(baseline.temp); }
      expect(showcaseSample(n, new Date(450000), 0, 450000)).toEqual(showcaseSample(n, new Date(450000), 0, null));
      expect(baseline).not.toHaveProperty("state");
      expect(elevated).not.toHaveProperty("probability");
    }
  });
});
