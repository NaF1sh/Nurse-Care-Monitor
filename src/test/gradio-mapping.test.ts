import { afterEach, describe, expect, it, vi } from "vitest";
import { callGradio, parsePredictResponse, requestGradioPrediction, safeDiagnosticText, validatePredictInput } from "@/lib/simulation.functions";

describe("Gradio response mapping", () => {
  it("maps HIGH_STRESS to high with probabilities", () => {
    const r = parsePredictResponse({ state: "HIGH_STRESS", high_stress_probability: 0.82, raw_probability: 0.9, alert_triggered: true });
    expect(r).toMatchObject({ ok: true, phase: "prediction", stress_level: "high", high_stress_probability: 0.82, alert_triggered: true });
  });
  it("treats unknown state as calibrating, never a guessed level", () => {
    const r = parsePredictResponse({ state: "CALIBRATING", calibration_status: "120/1800" });
    expect(r).toMatchObject({ ok: true, phase: "calibrating", stress_level: "unknown" });
  });
  it("missing probability stays null", () => {
    const r = parsePredictResponse({ state: "NORMAL" });
    expect(r).toMatchObject({ ok: true, stress_level: "normal", high_stress_probability: null });
  });
  it("uses actual API calibration status when the state is PENDING", () => {
    expect(parsePredictResponse({ state: "PENDING", calibration_status: "calibrating" })).toMatchObject({ phase: "calibrating", state: "PENDING", high_stress_probability: null });
    expect(parsePredictResponse({ state: "PENDING", calibration_status: "collecting_window" })).toMatchObject({ phase: "calibrating", state: "PENDING" });
  });
  it("success:false Model unavailable is reported as such", () => {
    expect(parsePredictResponse({ success: false, error: "Model unavailable" })).toMatchObject({ ok: false, reason: "model_unavailable" });
  });
  it("does not invent a successful result for an empty response", () => {
    expect(parsePredictResponse({})).toMatchObject({ ok: false, reason: "invalid_response" });
  });
  it("preserves returned probability exactly and unknown states without guessing calibration", () => {
    expect(parsePredictResponse({ state: "UNRECOGNIZED", high_stress_probability: 0.823456 })).toMatchObject({ ok: true, phase: "prediction", stress_level: "unknown", high_stress_probability: 0.823456 });
  });
  it("redacts credentials from diagnostic errors", () => {
    expect(safeDiagnosticText("Bearer private-secret hf_fakeToken" )).toBe("[redacted] [redacted]");
  });
  it("rejects invalid sensor values", () => {
    expect(() => validatePredictInput({ subject_id: "N-001", readings: [{ timestamp: "x", eda: 1, hr: 80, temp: 36, acc_x: 0, acc_y: 0, acc_z: 1 }] })).toThrow();
  });
});

describe("public Gradio connection", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("uses the specified Space and named health endpoint without a token", async () => {
    vi.stubEnv("GRADIO_SPACE_URL", "");
    vi.stubEnv("HF_API_TOKEN", "test-only-credential");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ event_id: "test-event" })))
      .mockResolvedValueOnce(new Response('event: complete\ndata: [{"model_loaded":false,"status":"error"}]\n\n'));
    vi.stubGlobal("fetch", fetchMock);
    expect(await callGradio("health", [])).toMatchObject({ ok: true, value: { model_loaded: false, status: "error" } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://aahsann-justnova-deepfake-detector.hf.space/gradio_api/call/health");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://aahsann-justnova-deepfake-detector.hf.space/gradio_api/call/health/test-event");
    expect(fetchMock.mock.calls.every((call) => !("Authorization" in call[1].headers))).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({ data: [] });
  });
  it("preserves actual ALERT and probability without assigning an inferred stress level", () => {
    expect(parsePredictResponse({ state: "ALERT", high_stress_probability: 0.536512095348628 })).toMatchObject({ state: "ALERT", high_stress_probability: 0.536512095348628, stress_level: "unknown" });
  });
  it("rejects duplicate and reversed timestamps", () => {
    const r = { timestamp: "2026-10-24T10:00:00Z", eda: 1, hr: 80, temp: 36, acc_x: 0, acc_y: 0, acc_z: 1 };
    expect(() => validatePredictInput({ subject_id: "N-001", readings: [r, r] })).toThrow("strictly increasing");
    expect(() => validatePredictInput({ subject_id: "N-001", readings: [r, { ...r, timestamp: "2026-10-24T09:59:59Z" }] })).toThrow("strictly increasing");
  });

  it("reports authentication required only after an actual rejection", async () => {
    vi.stubEnv("HF_API_TOKEN", "");
    const fetchMock = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await callGradio("reset_subject", ["N-001"])).toMatchObject({ ok: false, detail: "HTTP 401 — Space authentication required; configure HF_API_TOKEN on the server" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("uses configurable timeout and marks dispatch uncertain without retrying", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GRADIO_REQUEST_TIMEOUT_MS", "1000");
    const fetchMock = vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const pending = callGradio("predict", ["{}"]);
      await vi.advanceTimersByTimeAsync(1000);
      expect(await pending).toMatchObject({ ok: false, timeout: true, outcome_uncertain: true, detail: "Timed out after 1000 ms — batch outcome uncertain; do not retry" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });
  it("returns the completed SSE result without waiting for the connection to close", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('event: complete\ndata: [{"state":"ALERT"}]\n\n')); }, cancel });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response('{"event_id":"e"}')).mockResolvedValueOnce(new Response(stream)));
    expect(await callGradio("predict", ["{}"]).then(r => r.ok && r.value)).toEqual({ state: "ALERT" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("passes subject_id and timestamped sensor readings as the Gradio JSON payload", async () => {
    vi.stubEnv("HF_API_TOKEN", "");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ event_id: "test-event" })))
      .mockResolvedValueOnce(new Response('event: complete\ndata: [{"success":false,"error":"Model unavailable","details":"No module named \'_loss\'"}]\n\n'));
    vi.stubGlobal("fetch", fetchMock);
    const input = { subject_id: "N-001", readings: [{ timestamp: "2026-10-24T10:00:00Z", eda: 2.4, hr: 92, temp: 36.5, acc_x: 0.1, acc_y: 0.2, acc_z: 0.9 }] };
    const result = await callGradio("predict", [JSON.stringify(input)]);
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({ data: [JSON.stringify(input)] });
    expect(result.ok && parsePredictResponse(result.value)).toMatchObject({ ok: false, reason: "model_unavailable", detail: "Model unavailable — No module named '_loss'" });
  });
  it("logs real per-nurse outcomes without sensor payloads and returns server diagnostics", async () => {
    vi.stubEnv("HF_API_TOKEN", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ event_id: "e" })))
      .mockResolvedValueOnce(new Response('event: complete\ndata: [{"subject_id":"N-001","samples_received":1,"state":"HIGH_STRESS","high_stress_probability":0.823456,"raw_probability":0.9,"alert_triggered":true,"out_of_distribution":false}]\n\n')));
    const result = await requestGradioPrediction({ subject_id: "N-001", readings: [{ timestamp: "2026-10-24T10:00:00Z", eda: 2.4, hr: 92, temp: 36.5, acc_x: 0.1, acc_y: 0.2, acc_z: 0.9 }] });
    expect(result).toMatchObject({ ok: true, high_stress_probability: 0.823456, diagnostic: { returned_subject_id: "N-001", samples_sent: 1, request_success: true } });
    const log = JSON.parse(info.mock.calls[0]?.[0]);
    expect(log).toMatchObject({ subject_id: "N-001", samples_received: 1, returned_state: "HIGH_STRESS", returned_probability: 0.823456, raw_probability: 0.9, alert_triggered: true, out_of_distribution: false });
    expect(log).not.toHaveProperty("readings");
    expect(Number.isNaN(Date.parse(result.diagnostic?.completed_at ?? ""))).toBe(false);
  });
  it("rejects a real response for the wrong nurse", async () => {
    vi.stubEnv("HF_API_TOKEN", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ event_id: "e" })))
      .mockResolvedValueOnce(new Response('event: complete\ndata: [{"subject_id":"N-002","state":"NORMAL"}]\n\n')));
    expect(await requestGradioPrediction({ subject_id: "N-001", readings: [{ timestamp: "2026-10-24T10:00:00Z", eda: 2.4, hr: 92, temp: 36.5, acc_x: 0.1, acc_y: 0.2, acc_z: 0.9 }] })).toMatchObject({ ok: false, reason: "invalid_response", diagnostic: { request_success: false, returned_subject_id: "N-002" } });
  });
  it("does not invent accepted counts or OOD flags when the API omits them", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response('{"event_id":"e"}')).mockResolvedValueOnce(new Response('event: complete\ndata: [{"subject_id":"V-test-1","state":"PENDING","calibration_status":"calibrating"}]\n\n')));
    expect(await requestGradioPrediction({ subject_id: "V-test-1", readings: [{ timestamp: "2026-10-25T04:00:00Z", eda: 4.5, hr: 74, temp: 36.6, acc_x: 0, acc_y: 0, acc_z: 1 }] })).toMatchObject({ diagnostic: { samples_received: null, alert_triggered: null, out_of_distribution: null } });
  });
});
