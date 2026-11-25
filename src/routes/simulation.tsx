import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock3, Play, Square, TriangleAlert } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { AppShell, StressBadge } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSimulator, sampleAround, SAMPLE_INTERVAL_MS, SIM_NURSES, SHOWCASE_NURSES, showcaseSample, showcaseMayElevate, calibrationMsFromModel, sampleToReading, type SimReading } from "@/lib/simulation";
import { checkModelHealth, predictStress, resetSubject, type ModelSample, type PredictionDiagnostic } from "@/lib/simulation.functions";
import type { StressLevel } from "@/lib/store";
import { fmtTimeSec } from "@/lib/store";
import { PredictionBatches } from "@/lib/prediction-batches";
import { formatPredictionTime, predictionClock, type TimingSnapshot } from "@/lib/prediction-timing";
import { clockLabelT, clockStateT, useT, type StringKey } from "@/lib/i18n";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "Live Simulation — Nurse Stress Monitor" },
      { name: "description", content: "Demo simulation with synthetic sensor data — not real patient data." },
      { property: "og:title", content: "Live Simulation — Nurse Stress Monitor" },
      { property: "og:description", content: "Demo simulation with synthetic sensor data — not real patient data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AppShell title="Live Nurse Stress Simulation"><Simulation /></AppShell>,
});

const INTERVAL_SEC = 30;
const LEVEL_VALUE: Record<StressLevel, number | null> = { normal: 1, moderate: 2, high: 3, unknown: null };
const LINE_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

interface LastPrediction {
  level: StressLevel; state: string | null; prob: number | null; raw: number | null;
  ood: boolean; modelAlert: boolean; at: string;
}
interface NurseStatus { kind: "waiting" | "calibrating" | "ok" | "error"; text: string }
interface Alert { id: number; nurse_code: string; started_at: string; status: "active" | "acknowledged" | "resolved" }
type Health = { kind: "checking" } | { kind: "ready" } | { kind: "down"; detail: string };
interface ModelConfig { calibrationMinutes: number | null; windowSeconds: number | null; expectedFirstSeconds: number | null }
type ProfileSession = { startedAt: number; elevatedAt: number | null; accepted: number; calibration: string | null; calibrationMs?: number | null };

function Simulation() {
  const t = useT();
  const [showcase, setShowcase] = useState(true);
  return <>
    <div className="mb-3 flex gap-2" role="group" aria-label="Simulation view">
      <Button size="sm" variant={showcase ? "default" : "outline"} aria-pressed={showcase} onClick={() => setShowcase(true)}>{t("sim.view.showcase")}</Button>
      <Button size="sm" variant={!showcase ? "default" : "outline"} aria-pressed={!showcase} onClick={() => setShowcase(false)}>{t("sim.view.standard")}</Button>
    </div>
    <SimulationView key={showcase ? "showcase" : "standard"} showcase={showcase} />
  </>;
}

function SimulationView({ showcase }: { showcase: boolean }) {
  const t = useT();
  const nurses = showcase ? SHOWCASE_NURSES : SIM_NURSES;
  const runPrediction = useServerFn(predictStress);
  const runHealth = useServerFn(checkModelHealth);
  const runReset = useServerFn(resetSubject);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [clockNow, setClockNow] = useState(0);
  const [nextBatchAt, setNextBatchAt] = useState<number | null>(null);
  const [sampleRateHz, setSampleRateHz] = useState<number | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [timingSnapshots, setTimingSnapshots] = useState<Record<string, TimingSnapshot>>({});
  const [readings, setReadings] = useState<Record<string, SimReading[]>>({});
  const [lastPred, setLastPred] = useState<Record<string, LastPrediction>>({});
  const [status, setStatus] = useState<Record<string, NurseStatus>>({});
  const [chart, setChart] = useState<Record<string, number | string | null>[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [threshold, setThreshold] = useState(3);
  const [health, setHealth] = useState<Health>({ kind: "checking" });
  const [samplesSent, setSamplesSent] = useState(0);
  const [lastRequest, setLastRequest] = useState<PredictionDiagnostic | null>(null);
  const [profileInfo, setProfileInfo] = useState<Record<string, { accepted: number; calibration: string | null; elevated: boolean }>>({});
  const profileSession = useRef<Record<string, ProfileSession>>({});

  const simRef = useRef(createSimulator());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anchors = useRef<Record<string, SimReading>>({});
  const buffers = useRef<Record<string, ModelSample[]>>({});
  const batches = useRef(new PredictionBatches());
  const consecHigh = useRef<Record<string, number>>({});
  const alertId = useRef(1);
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  async function refreshHealth() {
    try {
      const h = await runHealth();
      if (h.ok) setModelConfig({ calibrationMinutes: h.calibration_minutes ?? null, windowSeconds: h.window_seconds ?? null, expectedFirstSeconds: h.expected_first_prediction_seconds ?? null });
      setSampleRateHz(h.ok && h.sample_rate_hz && h.sample_rate_hz > 0 ? h.sample_rate_hz : null);
      if (h.ok && h.model_loaded) setHealth({ kind: "ready" });
      else setHealth({ kind: "down", detail: h.ok ? (h.detail ?? `status: ${h.status}`) : h.detail });
      return h;
    } catch {
      setHealth({ kind: "down", detail: "Health check failed" });
      return null;
    }
  }

  useEffect(() => {
    batches.current = new PredictionBatches(window.localStorage);
    setClockNow(Date.now());
    if (showcase) {
      for (const n of nurses) {
        try {
          const saved = JSON.parse(localStorage.getItem(`showcase-profile-v1:${n.code}`) ?? "null");
          if (saved && Number.isFinite(saved.startedAt) && Number.isFinite(saved.accepted)) profileSession.current[n.code] = saved;
        } catch { /* Fresh baseline when no valid session is stored. */ }
      }
    }
    void refreshHealth();
    const id = setInterval(() => void refreshHealth(), 60_000);
    const clock = setInterval(() => setClockNow(Date.now()), 1000);
    return () => { clearInterval(id); clearInterval(clock); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runCycle() {
    const now = new Date();
    const batch = showcase ? nurses.map((n) => {
      const session = profileSession.current[n.code] ??= { startedAt: now.getTime(), elevatedAt: null, accepted: 0, calibration: null };
      return sampleToReading(n.code, showcaseSample(n, now, session.startedAt, session.elevatedAt));
    }) : simRef.current.next();
    // Samples collected at 4 Hz since the previous cycle.
    const toSend = nurses.map((n) => ({ code: n.code, samples: buffers.current[n.code] ??= [] }));
    for (const r of batch) anchors.current[r.nurse_code] = r;
    setReadings((prev) => {
      const next = { ...prev };
      for (const r of batch) next[r.nurse_code] = [...(next[r.nurse_code] ?? []), r].slice(-60);
      return next;
    });

    const sendable = toSend.filter((s) => s.samples.length > 0);
    if (sendable.length === 0) return; // first cycle: stream just started
    const results = await Promise.allSettled(
      sendable.map((s) => {
        const send = () => batches.current.send(s.code, s.samples, async (data) => {
          setSamplesSent((c) => c + data.readings.length);
          setPending(p => ({ ...p, [s.code]: true }));
          try {
            const value = await runPrediction({ data });
            // Settle each nurse immediately; another nurse's slower API must not hold its clock.
            setTimingSnapshots(p => ({ ...p, [s.code]: { result: value, acceptedThrough: Date.parse(data.readings.at(-1)?.timestamp ?? "") } }));
            return value;
          } catch {
            const value = { ok: false as const, reason: "api_error" as const, detail: "Request connection failed — outcome uncertain" };
            setTimingSnapshots(p => ({ ...p, [s.code]: { result: value, acceptedThrough: 0 } }));
            throw new Error("Prediction request connection failed");
          } finally {
            setPending(p => ({ ...p, [s.code]: false }));
            setClockNow(Date.now());
          }
        });
        // Origin-wide lock protects the shared subject across tabs, including stop/start.
        return navigator.locks ? navigator.locks.request(`gradio-predict:${s.code}`, { ifAvailable: true }, (lock) => lock ? send() : null) : send();
      }),
    );
    const at = new Date().toISOString();
    const point: Record<string, number | string | null> = { t: new Date(at).toLocaleTimeString() };

    results.forEach((res, i) => {
      const code = sendable[i]?.code;
      if (!code) return;
      const value = res.status === "fulfilled" ? res.value : { ok: false as const, reason: "api_error" as const, detail: "Prediction request failed" };
      if (!value) return;
      point[code] = null;
      if (!value.ok) {
        setStatus((p) => ({ ...p, [code]: { kind: "error", text: `${t(`fail.${value.reason}` as StringKey)}${value.detail ? ` — ${value.detail}` : ""}` } }));
        return;
      }
      const diagnostic = value.diagnostic;
      if (diagnostic?.request_success) {
        setLastRequest((previous) => !previous || diagnostic.completed_at >= previous.completed_at ? diagnostic : previous);
      }
      if (showcase && diagnostic?.request_success) {
        const session = profileSession.current[code];
        if (session) {
          session.accepted += diagnostic.samples_received ?? diagnostic.samples_sent;
          session.calibration = value.calibration_status;
          if (code !== "N-003" && session.elevatedAt == null && showcaseMayElevate(session.startedAt, Date.parse(diagnostic.last_timestamp), value.calibration_status, session.calibrationMs ?? null)) session.elevatedAt = Date.now();
          try { localStorage.setItem(`showcase-profile-v1:${code}`, JSON.stringify(session)); } catch { /* Keep current session in memory. */ }
          setProfileInfo(p => ({ ...p, [code]: { accepted: session.accepted, calibration: session.calibration, elevated: session.elevatedAt != null } }));
        }
      }
      setLastPred((p) => ({ ...p, [code]: {
        level: value.stress_level, state: value.state, prob: value.high_stress_probability,
        raw: value.raw_probability, ood: value.out_of_distribution, modelAlert: value.alert_triggered,
        at: diagnostic?.completed_at ?? at,
      } }));
      if (value.phase === "calibrating") {
        setStatus((p) => ({ ...p, [code]: { kind: "calibrating", text: `${t("sim.calibrating")}${value.calibration_status ? ` — ${value.calibration_status}` : "…"}` } }));
        return;
      }
      setStatus((p) => ({ ...p, [code]: { kind: "ok", text: "" } }));
      point[code] = LEVEL_VALUE[value.stress_level];
      consecHigh.current[code] = value.stress_level === "high" ? (consecHigh.current[code] ?? 0) + 1 : 0;
      if (
        (value.alert_triggered || (!showcase && consecHigh.current[code] >= thresholdRef.current)) &&
        !alertsRef.current.some((a) => a.nurse_code === code && a.status !== "resolved")
      ) {
        setAlerts((prev) => [...prev, { id: alertId.current++, nurse_code: code, started_at: at, status: "active" }]);
      }
    });
    setChart((prev) => [...prev, point].slice(-60));
  }

  /** Showcase only: one confirmed /reset_subject per nurse per new start; never during ordinary batches. */
  async function resetShowcaseSubjects(): Promise<string | null> {
    const h = await refreshHealth();
    if (!h || !h.ok || !h.model_loaded) return "Model not ready — simulation not started";
    const healthCalMs = calibrationMsFromModel(h.calibration_minutes);
    if (healthCalMs == null) return "Model did not report its calibration time — simulation not started";
    const failures: string[] = [];
    await Promise.all(nurses.map(async (n) => {
      const reset = async () => {
        const r = await runReset({ data: { subject_id: n.code } });
        if (!r.ok) { failures.push(`${n.code}: ${r.detail ?? "reset failed"}${r.outcome_uncertain ? " (outcome uncertain)" : ""}`); return; }
        if (!batches.current.confirmRemoteReset(n.code)) { failures.push(`${n.code}: a request is still in progress`); return; }
        const session: ProfileSession = { startedAt: Date.now(), elevatedAt: null, accepted: 0, calibration: null, calibrationMs: calibrationMsFromModel(r.calibration_minutes) ?? healthCalMs };
        profileSession.current[n.code] = session;
        try { localStorage.setItem(`showcase-profile-v1:${n.code}`, JSON.stringify(session)); } catch { /* Keep current session in memory. */ }
      };
      try {
        if (navigator.locks) await navigator.locks.request(`gradio-predict:${n.code}`, { ifAvailable: true }, async (lock) => lock ? reset() : failures.push(`${n.code}: another tab is sending for this nurse`));
        else await reset();
      } catch { failures.push(`${n.code}: reset request failed (outcome uncertain)`); }
    }));
    if (failures.length) return `Reset not confirmed — ${failures.join("; ")}`;
    // Fresh session: clear only the previous on-screen results for these nurses.
    for (const n of nurses) { buffers.current[n.code] = []; delete anchors.current[n.code]; consecHigh.current[n.code] = 0; }
    setTimingSnapshots({}); setLastPred({}); setReadings({}); setChart([]); setAlerts([]); setSamplesSent(0); setLastRequest(null);
    setProfileInfo(Object.fromEntries(nurses.map(n => [n.code, { accepted: 0, calibration: null, elevated: false }])));
    return null;
  }

  async function start() {
    if (timerRef.current || startingRef.current) return; // never start a second scheduler
    setStartError(null);
    if (showcase) {
      startingRef.current = true;
      setStarting(true);
      const error = await resetShowcaseSubjects();
      startingRef.current = false;
      setStarting(false);
      if (error) { setStartError(error); return; }
    }
    if (timerRef.current) return;
    setRunning(true);
    const schedulerStartedAt = Date.now();
    setSessionStartedAt(schedulerStartedAt);
    setClockNow(schedulerStartedAt);
    setNextBatchAt(schedulerStartedAt + INTERVAL_SEC * 1000);
    setStatus(Object.fromEntries(nurses.map((n) => [n.code, { kind: "waiting", text: t("sim.collecting") }])));
    // Ordinary batches never reset; only the confirmed showcase start above does.
    void runCycle();
    sampleRef.current = setInterval(() => {
      const now = new Date();
      for (const n of nurses) {
        const a = anchors.current[n.code];
        if (!a) continue;
        const queued = buffers.current[n.code] ??= [];
        const session = profileSession.current[n.code];
        if (queued.length < 600) queued.push(showcase && session ? showcaseSample(n, now, session.startedAt, session.elevatedAt) : sampleAround(a, now));
      }
    }, SAMPLE_INTERVAL_MS);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setNextBatchAt(schedulerStartedAt + (Math.floor((now - schedulerStartedAt) / (INTERVAL_SEC * 1000)) + 1) * INTERVAL_SEC * 1000);
      setClockNow(now);
      void runCycle();
    }, INTERVAL_SEC * 1000);
  }

  function clearTimers() {
    for (const r of [timerRef, sampleRef]) { if (r.current) clearInterval(r.current); r.current = null; }
  }

  function stop() {
    clearTimers();
    setRunning(false);
    setNextBatchAt(null);
  }

  useEffect(() => () => clearTimers(), []);

  const counts = { normal: 0, moderate: 0, high: 0 };
  for (const n of nurses) {
    const l = lastPred[n.code]?.level;
    if (l === "normal" || l === "moderate" || l === "high") counts[l] += 1;
  }
  const openAlerts = alerts.filter((a) => a.status !== "resolved");

  const levelTick = (v: number | string) => ({ 1: t("stress.normal"), 2: t("stress.moderate"), 3: t("stress.high") })[v as number] ?? "";

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border border-status-moderate bg-status-moderate-soft px-4 py-2.5 text-sm font-medium text-status-moderate">
        <TriangleAlert className="h-4 w-4 shrink-0" />
        {t("sim.demoBanner")}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {running ? (
          <Button variant="destructive" onClick={stop}><Square className="h-4 w-4" />{t("sim.stop")}</Button>
        ) : (
          <Button onClick={start} disabled={starting}><Play className="h-4 w-4" />{starting ? t("sim.resetting") : t("sim.start")}</Button>
        )}
        {running && <span className="text-sm text-muted-foreground">{t("sim.runningInfo", { next: nextBatchAt != null && nextBatchAt > clockNow ? `${Math.ceil((nextBatchAt - clockNow) / 1000)}s` : t("sim.waiting"), count: samplesSent })}</span>}
        <span className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${health.kind === "ready" ? "text-status-normal" : health.kind === "down" ? "text-status-high" : "text-muted-foreground"}`}
          title={health.kind === "down" ? health.detail : undefined}>
          <span className={`h-2 w-2 rounded-full ${health.kind === "ready" ? "bg-status-normal" : health.kind === "down" ? "bg-status-high" : "bg-muted-foreground"}`} />
          {health.kind === "ready" ? t("sim.modelReady") : health.kind === "down" ? t("sim.modelUnavailable") : t("sim.checkingModel")}
        </span>
        {!showcase && <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          {t("sim.alertAfter")}
          <Input type="number" min={1} max={10} value={threshold}
            onChange={(e) => setThreshold(Math.max(1, Math.min(10, Number(e.target.value) || 3)))}
            className="h-8 w-16" />
          {t("sim.consecHigh")}
        </label>}
      </div>

      {startError && <p className="mt-2 text-sm font-medium text-status-high" role="alert">{t("sim.apiErrorPrefix")} — {startError}</p>}
      <p className="mt-2 text-xs text-muted-foreground" aria-label="Model timing">
        {t("sim.modelReports", {
          calibration: modelConfig?.calibrationMinutes != null ? t("sim.calibration", { min: modelConfig.calibrationMinutes }) : t("sim.calibrationNotReported"),
          window: modelConfig?.windowSeconds != null ? t("sim.window", { sec: modelConfig.windowSeconds }) : t("sim.windowNotReported"),
          first: modelConfig?.expectedFirstSeconds != null ? t("sim.first", { time: formatPredictionTime(modelConfig.expectedFirstSeconds) }) : t("sim.firstNotReported"),
        })}
        {showcase && running && sessionStartedAt != null && <> · {t("sim.elapsed", { time: formatPredictionTime((clockNow - sessionStartedAt) / 1000) })}</>}
        {showcase && ` · ${t("sim.resetNote")}`}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Next Prediction In summary">
        <span className="flex items-center gap-1.5 font-medium"><Clock3 className="h-3.5 w-3.5" />{t("sim.nextPredictionIn")}</span>
        {nurses.map(n => {
          const queued = buffers.current[n.code] ?? [];
          const clock = predictionClock({ now: clockNow, running, pending: pending[n.code] === true, uncertain: batches.current.getProgress(n.code).uncertain, modelReady: health.kind === "ready", nextBatchAt, batchIntervalMs: INTERVAL_SEC * 1000, latestSampleAt: queued.length ? Date.parse(queued.at(-1)?.timestamp ?? "") : timingSnapshots[n.code]?.acceptedThrough ?? null, queuedSamples: queued.length, sampleRateHz, snapshot: timingSnapshots[n.code] });
          return <span key={n.code} className="min-w-0" title={clockLabelT(clock.label, t)}>{n.code} · {clockStateT(clock.phase, t)} <span className="font-mono tabular-nums">{clock.seconds != null ? `~${formatPredictionTime(clock.seconds)}` : clockLabelT(clock.label, t)}</span></span>;
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-label="Hugging Face request diagnostic">
        {lastRequest ? t("sim.lastRequest", { time: fmtTimeSec(lastRequest.completed_at), returned: lastRequest.returned_subject_id ?? t("sim.notReturned"), sent: lastRequest.requested_subject_id, samples: lastRequest.samples_sent }) : t("sim.noRequest")}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: t("sim.stat.nurses"), value: nurses.length, cls: "text-foreground" },
          { label: t("sim.stat.normal"), value: counts.normal, cls: "text-status-normal" },
          { label: t("sim.stat.moderate"), value: counts.moderate, cls: "text-status-moderate" },
          { label: t("sim.stat.high"), value: counts.high, cls: "text-status-high" },
          { label: t("sim.stat.alerts"), value: openAlerts.length, cls: openAlerts.length ? "text-status-high" : "text-foreground" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`mt-1 font-mono text-2xl font-semibold ${s.cls}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {openAlerts.length > 0 && (
        <Card className="mt-4 border-status-high">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-status-high">
            <AlertTriangle className="h-4 w-4" />{t("sim.alerts.title")}
          </CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {openAlerts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
                <span className="font-mono font-medium">{a.nurse_code}</span>
                <span className="text-muted-foreground">{t("sim.alerts.since", { time: fmtTimeSec(a.started_at) })}</span>
                <Badge variant={a.status === "active" ? "destructive" : "secondary"} className="capitalize">{t(`sim.alertStatus.${a.status}` as StringKey)}</Badge>
                <div className="ml-auto flex gap-2">
                  {a.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => setAlerts((p) => p.map((x) => x.id === a.id ? { ...x, status: "acknowledged" } : x))}>{t("sim.alerts.acknowledge")}</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setAlerts((p) => p.map((x) => x.id === a.id ? { ...x, status: "resolved" } : x))}>{t("sim.alerts.resolve")}</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nurses.map((n) => {
          const latest = readings[n.code]?.at(-1);
          const pred = lastPred[n.code];
          const st = status[n.code];
          const queued = buffers.current[n.code] ?? [];
          const clock = predictionClock({ now: clockNow, running, pending: pending[n.code] === true, uncertain: batches.current.getProgress(n.code).uncertain, modelReady: health.kind === "ready", nextBatchAt, batchIntervalMs: INTERVAL_SEC * 1000, latestSampleAt: queued.length ? Date.parse(queued.at(-1)?.timestamp ?? "") : timingSnapshots[n.code]?.acceptedThrough ?? null, queuedSamples: queued.length, sampleRateHz, snapshot: timingSnapshots[n.code] });
          return (
            <Card key={n.code}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{n.name}</CardTitle>
                  <Badge variant="outline" className="font-mono">{n.code}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{n.ward} · <span className="font-medium">{t("sim.simulatedDevice")}</span></p>
                {showcase && <p className="text-xs text-muted-foreground">{t("sim.inputProfile")}: {n.code === "N-003" ? t("sim.profile.control") : profileInfo[n.code]?.elevated ? t("sim.profile.elevated") : t("sim.profile.baseline")}</p>}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex min-h-12 items-start gap-2 border-b pb-2" aria-label={`Next Prediction In ${n.code}`}>
                  <Clock3 className={`mt-0.5 h-4 w-4 shrink-0 ${clock.phase === "error" ? "text-status-high" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{t("sim.nextPredictionIn")} · <span className={`font-semibold ${clock.phase === "error" ? "text-status-high" : "text-foreground"}`}>{clockStateT(clock.phase, t)}</span></p>
                    <p className={`break-words text-xs font-medium ${clock.phase === "error" ? "text-status-high" : "text-foreground"}`}>{clockLabelT(clock.label, t)}{clock.seconds != null && <span className="ml-2 inline-block font-mono text-base tabular-nums">~{formatPredictionTime(clock.seconds)}</span>}</p>
                    {clock.detail && <p className="break-words text-xs text-muted-foreground">{clock.detail}</p>}
                  </div>
                </div>
                {latest ? (
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div><p className="text-muted-foreground">{t("sim.metric.heartRate")}</p><p>{latest.heart_rate} bpm</p></div>
                    <div><p className="text-muted-foreground">{t("sim.metric.skinTemp")}</p><p>{latest.skin_temperature} °C</p></div>
                    <div><p className="text-muted-foreground">{t("sim.metric.eda")}</p><p>{latest.eda} µS</p></div>
                    <div><p className="text-muted-foreground">{t("sim.metric.accelX")}</p><p>{latest.accel_x}</p></div>
                    <div><p className="text-muted-foreground">{t("sim.metric.accelY")}</p><p>{latest.accel_y}</p></div>
                    <div><p className="text-muted-foreground">{t("sim.metric.accelZ")}</p><p>{latest.accel_z}</p></div>
                  </div>
                ) : <p className="text-muted-foreground">{t("sim.noReading")}</p>}
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                  <StressBadge level={pred?.level} />
                  {st && st.kind !== "ok" && (
                    <span className={`text-right text-xs font-medium ${st.kind === "error" ? "text-status-high" : "text-muted-foreground"}`}>{st.text}</span>
                  )}
                </div>
                {pred && (
                  <p className="text-xs text-muted-foreground">
                    {pred.state && <>{t("sim.modelState", { state: pred.state })} · </>}
                    {pred.prob != null && <>{t("sim.highProb", { prob: pred.prob })} · </>}
                    {pred.raw != null && <>{t("sim.rawProb", { raw: pred.raw })} · </>}
                    <span className={pred.ood ? "text-status-moderate" : undefined}>{t("sim.ood", { value: pred.ood ? t("sim.yes") : t("sim.no") })} · </span>
                    <span className={pred.modelAlert ? "text-status-high" : undefined}>{t("sim.modelAlert", { value: pred.modelAlert ? t("sim.yes") : t("sim.no") })} · </span>
                    {t("sim.lastSuccess", { time: fmtTimeSec(pred.at) })}
                  </p>
                )}
                {latest && <p className="text-xs text-muted-foreground">{t("sim.lastReading", { time: fmtTimeSec(latest.recorded_at) })}</p>}
                {showcase && <p className="text-xs text-muted-foreground">{t("sim.acceptedSamples", { count: profileInfo[n.code]?.accepted ?? 0 })} · {t("sim.apiCalibration", { value: profileInfo[n.code]?.calibration ?? t("sim.notReceived") })} · {modelConfig?.calibrationMinutes != null ? t("sim.calibration", { min: modelConfig.calibrationMinutes }) : t("sim.calibrationNotReported")} / {modelConfig?.windowSeconds != null ? t("sim.window", { sec: modelConfig.windowSeconds }) : t("sim.windowNotReported")}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("sim.chart.title")}</CardTitle></CardHeader>
        <CardContent>
          {chart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("sim.chart.empty")}</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <XAxis dataKey="t" fontSize={11} />
                  <YAxis domain={[0, 4]} ticks={[1, 2, 3]} tickFormatter={levelTick} fontSize={11} />
                  <Tooltip formatter={levelTick} />
                  <Legend />
                  {nurses.map((n, i) => (
                    <Line key={n.code} type="monotone" dataKey={n.code} name={n.code} stroke={LINE_COLORS[i]} dot={false} connectNulls strokeWidth={2} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
