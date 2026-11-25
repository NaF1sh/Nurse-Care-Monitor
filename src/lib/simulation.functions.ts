import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StressLevel } from "./store";
import type { InferenceTiming } from "./prediction-timing";

/** One 4 Hz sample in the shape the Gradio model expects. */
export interface ModelSample {
  timestamp: string;
  eda: number;
  hr: number;
  temp: number;
  acc_x: number;
  acc_y: number;
  acc_z: number;
}

export interface PredictInput {
  subject_id: string;
  readings: ModelSample[];
}

export interface PredictionDiagnostic {
  requested_subject_id: string;
  returned_subject_id: string | null;
  samples_sent: number;
  samples_received: number | null;
  alert_triggered: boolean | null;
  out_of_distribution: boolean | null;
  first_timestamp: string;
  last_timestamp: string;
  duration_ms: number;
  http_status: number | null;
  outcome_uncertain: boolean;
  completed_at: string;
  request_success: boolean;
}

export type PredictResult =
  | {
      ok: true;
      /** "prediction" when the model returned a real state; "calibrating" while it is still collecting data. */
      phase: "prediction" | "calibrating";
      state: string | null;
      stress_level: StressLevel;
      high_stress_probability: number | null;
      raw_probability: number | null;
      alert_triggered: boolean;
      calibration_status: string | null;
      out_of_distribution: boolean;
      diagnostic?: PredictionDiagnostic;
      timing?: InferenceTiming;
    }
  | { ok: false; reason: "model_unavailable" | "timeout" | "api_error" | "invalid_response"; detail: string | null; diagnostic?: PredictionDiagnostic };

export type HealthResult =
  | { ok: true; model_loaded: boolean; status: string; detail: string | null; sample_rate_hz?: number | null; window_seconds?: number | null; calibration_minutes?: number | null; expected_first_prediction_seconds?: number | null }
  | { ok: false; detail: string };

type GradioObj = { subject_id?: unknown; success?: unknown; samples_received?: unknown; error?: unknown; details?: unknown; state?: unknown; calibration_status?: unknown; high_stress_probability?: unknown; raw_probability?: unknown; alert_triggered?: unknown; out_of_distribution?: unknown; model_loaded?: unknown; status?: unknown; sample_rate_hz?: unknown; window_seconds?: unknown; calibration_minutes?: unknown; expected_first_prediction_seconds?: unknown };

const DEFAULT_SPACE_URL = "https://aahsann-justnova-deepfake-detector.hf.space";
const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_READINGS = 600;

const num = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const prob = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null);
const bounded = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null;

/** Whitelist actual engine details; never expose the raw provider details object. */
export function parseInferenceTiming(details: unknown): InferenceTiming {
  const d = details && typeof details === "object" && !Array.isArray(details) ? details as Record<string, unknown> : {};
  const collected = bounded(d["samples_collected"], 100_000);
  const needed = bounded(d["samples_needed"], 100_000);
  return {
    calibration_seconds_remaining: bounded(d["seconds_remaining"], 86_400),
    window_samples_collected: collected != null && Number.isInteger(collected) ? collected : null,
    window_samples_needed: needed != null && Number.isInteger(needed) && needed > 0 ? needed : null,
  };
}

/** Only bounded, credential-free diagnostics are returned or logged; never sensor payloads. */
export function safeDiagnosticText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.replace(/Bearer\s+\S+/gi, "[redacted]").replace(/hf_[A-Za-z0-9]+/g, "[redacted]").slice(0, 300);
}

export function validatePredictInput(input: PredictInput): PredictInput {
  if (!input || typeof input.subject_id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(input.subject_id)) {
    throw new Error("Invalid subject_id");
  }
  if (!Array.isArray(input.readings) || input.readings.length === 0 || input.readings.length > MAX_READINGS) {
    throw new Error("Invalid readings");
  }
  let previous = -Infinity;
  for (const r of input.readings) {
    if (
      !r || typeof r.timestamp !== "string" || Number.isNaN(Date.parse(r.timestamp)) ||
      !num(r.hr, 20, 250) || !num(r.temp, 25, 45) || !num(r.eda, 0, 100) ||
      !num(r.acc_x, -50, 50) || !num(r.acc_y, -50, 50) || !num(r.acc_z, -50, 50)
    ) {
      throw new Error("Invalid sensor reading");
    }
    const timestamp = Date.parse(r.timestamp);
    if (timestamp <= previous) throw new Error("Reading timestamps must be strictly increasing");
    previous = timestamp;
  }
  return input;
}

/** Map the model's state label. Unrecognized labels stay "unknown" — never guessed. */
export function mapState(state: unknown): StressLevel {
  const s = String(state ?? "").toUpperCase().trim();
  if (s === "HIGH_STRESS" || s === "HIGH") return "high";
  if (s === "NORMAL") return "normal";
  return "unknown";
}

/** Turn the raw Gradio JSON into our result shape. Anything unexpected is an invalid response. */
export function parsePredictResponse(body: unknown): PredictResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, reason: "invalid_response", detail: null };
  }
  const b = body as GradioObj;
  if (b.success === false) {
    const detail = [b.error, b.details].map(safeDiagnosticText).filter(Boolean).join(" — ") || null;
    return { ok: false, reason: String(b.error ?? "").toLowerCase().includes("model unavailable") ? "model_unavailable" : "api_error", detail };
  }
  const state = typeof b.state === "string" ? b.state : null;
  if (!state?.trim()) return { ok: false, reason: "invalid_response", detail: "Gradio response has no state" };
  const level = mapState(state);
  const calibration = safeDiagnosticText(b.calibration_status);
  return {
    ok: true,
    phase: state.toUpperCase().includes("CALIBRAT") || calibration === "calibrating" || calibration === "collecting_window" ? "calibrating" : "prediction",
    state,
    stress_level: level,
    high_stress_probability: prob(b.high_stress_probability),
    raw_probability: prob(b.raw_probability),
    alert_triggered: b.alert_triggered === true,
    calibration_status: calibration,
    out_of_distribution: b.out_of_distribution === true,
    timing: parseInferenceTiming(b.details),
  };
}

/** Call a Gradio named endpoint via the documented two-step /call protocol (POST → event_id → SSE result). */
export async function callGradio(fn: "predict" | "health" | "reset_subject", data: unknown[]): Promise<{ ok: true; value: unknown; http_status: number } | { ok: false; timeout: boolean; detail: string; http_status: number | null; outcome_uncertain: boolean }> {
  const base = (process.env["GRADIO_SPACE_URL"] || DEFAULT_SPACE_URL).replace(/\/$/, "");
  const token = process.env["HF_API_TOKEN"];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const configuredTimeout = Number(process.env["GRADIO_REQUEST_TIMEOUT_MS"]);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000 && configuredTimeout <= 300_000 ? configuredTimeout : DEFAULT_TIMEOUT_MS;
  let httpStatus: number | null = null;
  let dispatched = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    dispatched = true;
    let start = await fetch(`${base}/gradio_api/call/${fn}`, {
      method: "POST", headers, body: JSON.stringify({ data }), signal: controller.signal,
    });
    // Public Spaces need no credential. Only retry with a server-side token
    // when the Space actually rejects anonymous access.
    if ((start.status === 401 || start.status === 403) && token) {
      headers["Authorization"] = `Bearer ${token}`;
      start = await fetch(`${base}/gradio_api/call/${fn}`, {
        method: "POST", headers, body: JSON.stringify({ data }), signal: controller.signal,
      });
    }
    httpStatus = start.status;
    if (!start.ok) return { ok: false, timeout: false, http_status: httpStatus, outcome_uncertain: start.status >= 500, detail: `HTTP ${start.status}${start.status === 401 || start.status === 403 ? " — Space authentication required; configure HF_API_TOKEN on the server" : ""}` };
    const { event_id } = (await start.json()) as { event_id?: string };
    if (!event_id) return { ok: false, timeout: false, http_status: httpStatus, outcome_uncertain: true, detail: "No event id" };

    const res = await fetch(`${base}/gradio_api/call/${fn}/${event_id}`, { headers, signal: controller.signal });
    httpStatus = res.status;
    if (!res.ok || !res.body) return { ok: false, timeout: false, http_status: httpStatus, outcome_uncertain: true, detail: `HTTP ${res.status} — queued request outcome unknown` };
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let event = "";
    try { while (true) {
      const chunk = await reader.read();
      pending += decoder.decode(chunk.value, { stream: !chunk.done });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      if (chunk.done && pending) { lines.push(pending); pending = ""; }
      for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "");
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (event === "error") {
          const withoutToken = token ? payload.split(token).join("[redacted]") : payload;
          return { ok: false, timeout: false, http_status: httpStatus, outcome_uncertain: true, detail: safeDiagnosticText(withoutToken) || "Gradio error" };
        }
        if (event === "complete") {
          const parsed = JSON.parse(payload) as unknown;
          return { ok: true, http_status: httpStatus, value: Array.isArray(parsed) ? parsed[0] : parsed };
        }
      }
      }
      if (chunk.done) break;
    } } finally { await reader.cancel().catch(() => {}); }
    return { ok: false, timeout: false, http_status: httpStatus, outcome_uncertain: true, detail: "No result" };
  } catch (e) {
    const timeout = controller.signal.aborted || (e instanceof Error && e.name === "AbortError");
    return { ok: false, timeout, http_status: httpStatus, outcome_uncertain: dispatched, detail: timeout ? `Timed out after ${timeoutMs} ms — batch outcome uncertain; do not retry` : "Request failed — batch outcome uncertain" };
  } finally {
    clearTimeout(timer);
  }
}

/** Called only by the authenticated handler; records the actual outcome, never the input payload. */
export async function requestGradioPrediction(data: PredictInput): Promise<PredictResult> {
  const started = Date.now();
  const r = await callGradio("predict", [JSON.stringify(data)]);
  let result: PredictResult = r.ok
    ? parsePredictResponse(r.value)
    : { ok: false, reason: r.timeout ? "timeout" : "api_error", detail: r.detail };
  const body = r.ok && r.value && typeof r.value === "object" ? r.value as GradioObj : null;
  const returnedSubject = typeof body?.subject_id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(body.subject_id) ? body.subject_id : null;
  if (returnedSubject && returnedSubject !== data.subject_id) {
    result = { ok: false, reason: "invalid_response", detail: "Gradio returned a different subject_id" };
  }
  const diagnostic: PredictionDiagnostic = {
    requested_subject_id: data.subject_id,
    returned_subject_id: returnedSubject,
    samples_sent: data.readings.length,
    samples_received: typeof body?.samples_received === "number" && Number.isInteger(body.samples_received) && body.samples_received >= 0 && body.samples_received <= data.readings.length ? body.samples_received : null,
    alert_triggered: typeof body?.alert_triggered === "boolean" ? body.alert_triggered : null,
    out_of_distribution: typeof body?.out_of_distribution === "boolean" ? body.out_of_distribution : null,
    first_timestamp: data.readings[0]?.timestamp ?? "",
    last_timestamp: data.readings.at(-1)?.timestamp ?? "",
    duration_ms: Date.now() - started,
    http_status: r.http_status,
    outcome_uncertain: r.ok ? !result.ok : r.outcome_uncertain,
    completed_at: new Date().toISOString(),
    request_success: result.ok,
  };
  const log = {
    event: result.ok ? "gradio_prediction_success" : "gradio_prediction_error",
    subject_id: data.subject_id,
    ...diagnostic,
    returned_state: safeDiagnosticText(body?.state),
    returned_probability: prob(body?.high_stress_probability),
    raw_probability: prob(body?.raw_probability),
    calibration_status: safeDiagnosticText(body?.calibration_status),
    error: result.ok ? null : result.reason,
    detail: result.ok ? null : safeDiagnosticText(result.detail),
  };
  if (result.ok) console.info(JSON.stringify(log));
  else console.error(JSON.stringify(log));
  return { ...result, diagnostic };
}

/** Send a batch of 4 Hz samples for one demo nurse to the Gradio /predict function. */
export const predictStress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validatePredictInput)
  .handler(async ({ data }): Promise<PredictResult> => {
    return requestGradioPrediction(data);
  });

export const checkModelHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<HealthResult> => {
    const r = await callGradio("health", []);
    if (!r.ok) return { ok: false, detail: r.detail };
    const v = (r.value ?? {}) as GradioObj;
    return {
      ok: true,
      model_loaded: v.model_loaded === true,
      status: String(v.status ?? "unknown"),
      detail: v.error ? String(v.error) : null,
      sample_rate_hz: bounded(v.sample_rate_hz, 1000),
      window_seconds: bounded(v.window_seconds, 86_400),
      calibration_minutes: bounded(v.calibration_minutes, 1440),
      expected_first_prediction_seconds: bounded(v.expected_first_prediction_seconds, 86_400),
    };
  });

export const resetSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject_id: string }) => {
    if (!d || typeof d.subject_id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(d.subject_id)) throw new Error("Invalid subject_id");
    return d;
  })
  .handler(async ({ data }): Promise<ResetResult> => {
    const r = await callGradio("reset_subject", [data.subject_id]);
    if (!r.ok) return { ok: false, detail: r.detail, outcome_uncertain: r.outcome_uncertain };
    return parseResetReply(data.subject_id, r.value);
  });

export type ResetResult =
  | { ok: true; subject_id: string; calibration_minutes: number | null; expected_first_prediction_seconds: number | null }
  | { ok: false; detail: string | null; outcome_uncertain: boolean };

/** A reset counts only when the Space confirms success for the same subject. */
export function parseResetReply(subject: string, value: unknown): ResetResult {
  const v = (Array.isArray(value) ? value[0] : value ?? {}) as GradioObj;
  if (v?.success !== true) return { ok: false, detail: v?.error ? String(v.error) : "Reset not confirmed by the model", outcome_uncertain: false };
  if (v.subject_id !== subject) return { ok: false, detail: "Reset reply was for a different subject", outcome_uncertain: true };
  return { ok: true, subject_id: subject, calibration_minutes: bounded(v.calibration_minutes, 1440), expected_first_prediction_seconds: bounded(v.expected_first_prediction_seconds, 86_400) };
}
