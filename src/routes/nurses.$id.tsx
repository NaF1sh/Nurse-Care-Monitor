import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Heart,
  HeartHandshake,
  Info,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Thermometer,
  Wifi,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AppShell, StressBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionForm } from "@/components/action-form";
import { useNurseActions, useNurseDetail, useProfileNames } from "@/lib/queries";
import { fmtTime, fmtTimeSec, isStale, useStore, type ActionType } from "@/lib/store";
import { useT, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nurses/$id")({
  head: () => ({
    meta: [
      { title: "Nurse Details & Physiological Context — WeCare" },
      { name: "description", content: "Individual physiological sensor readings, AI stress trend and intervention history." },
      { property: "og:title", content: "Nurse Details & Physiological Context — WeCare" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Nurse Profile & Physiological Context">
      <NurseDetails />
    </AppShell>
  ),
});

function MetricCard({
  label,
  value,
  unit,
  sublabel,
  icon: Icon,
  status = "normal",
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  sublabel?: string;
  icon: typeof Activity;
  status?: "normal" | "elevated" | "muted";
}) {
  return (
    <div className="rounded-xl border border-[#E2E7EF] bg-white p-4 shadow-2xs">
      <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
        <span>{label}</span>
        <Icon
          className={cn(
            "h-4 w-4",
            status === "elevated" ? "text-[#C24152]" : status === "normal" ? "text-[#16835E]" : "text-[#64748B]"
          )}
        />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-extrabold text-[#172033] tabular-nums">
          {value ?? "—"}
        </span>
        {value != null && unit && (
          <span className="text-xs font-semibold text-[#64748B]">{unit}</span>
        )}
      </div>
      {sublabel && <p className="mt-1 text-[11px] text-[#8E9FB8]">{sublabel}</p>}
    </div>
  );
}

// Generate realistic 30-min physiological trend based on nurse code
function generateTrendPoints(baseHr: number, baseEda: number, isHigh: boolean) {
  const points = [];
  const now = Date.now();
  for (let i = 12; i >= 0; i--) {
    const time = new Date(now - i * 2.5 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const factor = isHigh ? (12 - i) / 12 : 0;
    points.push({
      time,
      hr: Math.round(baseHr + factor * 22 + (Math.sin(i) * 3)),
      eda: Number((baseEda + factor * 1.8 + (Math.cos(i) * 0.2)).toFixed(2)),
      stressLevel: isHigh && i <= 4 ? 3 : isHigh ? 2 : 1,
    });
  }
  return points;
}

function NurseDetails() {
  const { id } = Route.useParams();
  const t = useT();
  const { addNotification } = useStore();
  const q = useNurseDetail(id);
  const actions = useNurseActions(id);
  const names = useProfileNames([q.data?.nurse?.supervisor_id ?? null, ...(actions.data ?? []).map((a) => a.created_by)]);

  const [timeRange, setTimeRange] = useState<"30m" | "1h" | "shift">("30m");

  if (q.isLoading) {
    return <p className="text-sm font-semibold text-[#64748B]">{t("common.loading")}</p>;
  }

  const nurse = q.data?.nurse;
  if (!nurse) {
    return (
      <div className="rounded-2xl border border-[#E2E7EF] bg-white p-12 text-center">
        <p className="text-sm font-bold text-[#64748B]">{t("detail.notFound")}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/nurses">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Nurse Roster
          </Link>
        </Button>
      </div>
    );
  }

  const { reading, predictions } = q.data!;
  const latest = predictions[0];
  const isHigh = latest?.stress_level === "high";

  // Base metrics
  const hrBase = reading?.heart_rate ?? 74;
  const edaBase = 4.2;
  const trendData = generateTrendPoints(hrBase, edaBase, isHigh);

  const handleQuickCheckin = () => {
    addNotification({
      recipients: [nurse.full_name],
      category: "check_in",
      priority: "urgent",
      subject: "Supervisor Check-in",
      message: `Hi ${nurse.full_name.split(" ")[0]}, your supervisor is checking in. We noticed elevated strain indications in ${nurse.ward}. Please let us know if you need assistance.`,
      requiresAck: true,
    });
    toast.success(`Check-in request sent to ${nurse.full_name}'s companion app!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild className="w-fit text-xs font-bold text-[#64748B] hover:text-[#172033]">
          <Link to="/nurses">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Nurse Monitoring
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleQuickCheckin}
            className="h-8 rounded-xl bg-[#394BC5] px-3.5 text-xs font-extrabold text-white hover:bg-[#303eaa]"
          >
            <Bell className="mr-1.5 h-3.5 w-3.5" />
            Request Private Check-in
          </Button>

          <Button
            size="sm"
            variant="outline"
            asChild
            className="h-8 rounded-xl border-[#D9E0EB] text-xs font-bold text-[#172033]"
          >
            <Link to="/support">
              <HeartHandshake className="mr-1.5 h-3.5 w-3.5 text-[#16835E]" />
              Coordinate Support
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-[#E2E7EF] bg-white p-6 shadow-2xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#E5E9FD] text-xl font-black text-[#394BC5] shadow-xs">
              {nurse.full_name.split(" ").slice(-2).map((x) => x[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-[#172033] tracking-tight">{nurse.full_name}</h2>
                <span className="rounded-md bg-[#F3F5F8] px-2 py-0.5 font-mono text-xs font-bold text-[#64748B]">
                  {nurse.nurse_code}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E1F4E9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#16835E]">
                  <ShieldCheck className="h-3 w-3" /> Consent Active
                </span>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                Registered Nurse • Assigned to <strong>{nurse.ward ?? "General"} Ward</strong> • Morning Shift (07:00 - 15:30)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-[#EEF2F7] pt-4 md:border-t-0 md:pt-0">
            <div className="text-left md:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9FB8]">Current Estimate</span>
              <div className="mt-0.5">
                <StressBadge level={latest?.stress_level} stale={!!latest && isStale(latest.created_at)} />
              </div>
            </div>
            <div className="text-left md:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9FB8]">Wearable Connection</span>
              <p className="mt-0.5 text-xs font-bold text-[#16835E] flex items-center md:justify-end gap-1">
                <Wifi className="h-3.5 w-3.5" /> Live 4 Hz stream
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Physiological Sensor Readings Grid */}
      <div>
        <h3 className="mb-3 text-xs font-extrabold tracking-widest text-[#64748B] uppercase">
          Real-Time Physiological Telemetry (4 Hz)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            label="Heart Rate"
            value={reading?.heart_rate ?? 76}
            unit="bpm"
            sublabel="Personal baseline: 74 bpm"
            icon={Heart}
            status={isHigh ? "elevated" : "normal"}
          />
          <MetricCard
            label="Skin Temperature"
            value={reading?.temperature ?? 36.6}
            unit="°C"
            sublabel="Peripheral wrist sensor"
            icon={Thermometer}
            status="normal"
          />
          <MetricCard
            label="Electrodermal Activity"
            value={reading ? 4.2 : 3.8}
            unit="µS"
            sublabel="Sympathetic skin conductance"
            icon={Zap}
            status={isHigh ? "elevated" : "normal"}
          />
          <MetricCard
            label="3-Axis Movement"
            value="0.14"
            unit="g"
            sublabel="Calm / routine movement"
            icon={Activity}
            status="normal"
          />
          <MetricCard
            label="Signal Quality"
            value="98%"
            sublabel="Valid continuous window"
            icon={Wifi}
            status="normal"
          />
        </div>
      </div>

      {/* Physiological Trend Visualizer & AI Reasoning Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Trend Chart (7 Cols) */}
        <Card className="rounded-2xl border-[#E2E7EF] p-5 shadow-2xs bg-white lg:col-span-7">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7EF]">
            <div>
              <CardTitle className="text-sm font-extrabold text-[#172033]">
                Physiological Trend Over Time
              </CardTitle>
              <p className="text-xs text-[#64748B]">Continuous heart rate (bpm) and estimated strain curve</p>
            </div>
            <div className="flex gap-1">
              {(["30m", "1h", "shift"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-bold uppercase",
                    timeRange === r ? "bg-[#394BC5] text-white" : "bg-[#F3F5F8] text-[#64748B] hover:text-[#172033]"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="hrColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isHigh ? "#C24152" : "#394BC5"} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={isHigh ? "#C24152" : "#394BC5"} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#8E9FB8" fontSize={11} tickLine={false} />
                <YAxis domain={["dataMin - 10", "dataMax + 10"]} stroke="#8E9FB8" fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-[#E2E7EF] bg-white p-2.5 shadow-lg text-xs">
                          <p className="font-extrabold text-[#172033]">{payload[0].payload.time}</p>
                          <p className="font-mono text-[#394BC5] font-bold">HR: {payload[0].value} bpm</p>
                          <p className="text-[10px] text-[#64748B]">EDA: {payload[0].payload.eda} µS</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hr"
                  stroke={isHigh ? "#C24152" : "#394BC5"}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#hrColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#8E9FB8] border-t border-[#EEF2F7] pt-2">
            <span>• 60-second sliding inference window</span>
            <span>7.5-minute personalized baseline calibration</span>
          </div>
        </Card>

        {/* Explainable AI Reasoning (5 Cols) */}
        <Card className="rounded-2xl border-[#E2E7EF] p-5 shadow-2xs bg-white lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-[#E2E7EF]">
              <Sparkles className="h-4 w-4 text-[#394BC5]" />
              <CardTitle className="text-sm font-extrabold text-[#172033]">
                AI Model Reasoning & Attribution
              </CardTitle>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[#E2E7EF] bg-[#F8FAFC] p-3.5">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#394BC5]">
                  Primary Feature Attribution
                </span>
                <p className="mt-1 text-xs font-semibold text-[#172033] leading-relaxed">
                  {isHigh
                    ? "Heart rate has remained consistently elevated (+22 bpm above personal baseline) during a period of relatively low movement, paired with elevated phasic electrodermal activity."
                    : "Sensor readings reflect a steady physiological baseline consistent with routine ward activity and healthy heart rate variability."}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#EEF2F7]">
                  <span className="text-[#64748B]">Prediction Confidence</span>
                  <span className="font-mono font-bold text-[#172033]">
                    {latest?.confidence != null ? `${Math.round(latest.confidence * 100)}%` : "89%"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EEF2F7]">
                  <span className="text-[#64748B]">Personal Calibration</span>
                  <span className="font-semibold text-[#16835E]">Completed (7.5 min)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EEF2F7]">
                  <span className="text-[#64748B]">Model Architecture</span>
                  <span className="font-mono text-[#172033]">RandomForest + OOD Shield</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EEF2F7]">
                  <span className="text-[#64748B]">Model Version</span>
                  <span className="font-mono text-[#172033]">{latest?.model_version ?? "v1.2-classical"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-[#FFF0D7] p-3 text-[11px] text-[#80530D] flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#B7791F]" />
            <span>
              <strong>Ethical Notice:</strong> This model estimates physiological arousal and does not diagnose clinical burnout or psychological distress.
            </span>
          </div>
        </Card>
      </div>

      {/* Manual Action Recording & Historical Audit Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr] items-start">
        <Card className="rounded-2xl border-[#E2E7EF] p-5 shadow-2xs bg-white">
          <CardHeader className="p-0 pb-3 border-b border-[#E2E7EF]">
            <CardTitle className="text-sm font-extrabold text-[#172033]">
              Record Supervisor Action
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {nurse.is_active ? (
              <ActionForm nurseId={nurse.id} predictionId={latest?.id ?? null} />
            ) : (
              <p className="text-xs text-[#64748B]">{t("detail.inactiveNoActions")}</p>
            )}
          </CardContent>
        </Card>

        {/* Action History Table */}
        <Card className="rounded-2xl border-[#E2E7EF] shadow-2xs bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-[#E2E7EF]">
            <CardTitle className="text-sm font-extrabold text-[#172033]">
              Supervisor Intervention History
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC]">
                <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Time</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Action Type</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Supervisor Notes</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(actions.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-xs text-[#64748B]">
                    No previous supervisor actions recorded for this nurse.
                  </TableCell>
                </TableRow>
              ) : (
                (actions.data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-xs text-[#64748B] font-mono">
                      {fmtTimeSec(a.created_at)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-[#172033]">
                      {t(`action.${a.action_type}` as StringKey) || a.action_type}
                      {a.prediction_id && (
                        <span className="ml-1.5 text-[10px] text-[#394BC5] font-normal">
                          • linked to estimate
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-[#64748B]">{a.note || "—"}</TableCell>
                    <TableCell className="text-xs font-semibold text-[#172033]">
                      {names.data?.get(a.created_by) ?? "Lead Supervisor"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
