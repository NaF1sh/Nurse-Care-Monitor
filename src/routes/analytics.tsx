import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  HeartHandshake,
  Info,
  TrendingUp,
  Users,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WARDS } from "@/lib/store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Workforce Reports — WeCare" },
      { name: "description", content: "Workforce well-being trends, relief response latency and monitoring coverage metrics." },
      { property: "og:title", content: "Analytics & Workforce Reports — WeCare" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Analytics & Reports">
      <AnalyticsPage />
    </AppShell>
  ),
});

const SHIFT_STRAIN_DATA = [
  { shift: "07:00 Morning Handover", normal: 18, moderate: 4, high: 2 },
  { shift: "10:00 Medication Rounds", normal: 14, moderate: 7, high: 3 },
  { shift: "13:00 Peak Triage Intake", normal: 11, moderate: 8, high: 5 },
  { shift: "15:30 Afternoon Shift", normal: 16, moderate: 5, high: 3 },
  { shift: "19:00 Visiting / Rounds", normal: 15, moderate: 6, high: 3 },
  { shift: "23:00 Night Shift Handover", normal: 19, moderate: 3, high: 1 },
];

const RESPONSE_LATENCY_DATA = [
  { day: "Mon", avgResponseMin: 3.4, ackRate: 94 },
  { day: "Tue", avgResponseMin: 2.8, ackRate: 98 },
  { day: "Wed", avgResponseMin: 4.1, ackRate: 91 },
  { day: "Thu", avgResponseMin: 2.9, ackRate: 96 },
  { day: "Fri", avgResponseMin: 3.2, ackRate: 95 },
  { day: "Sat", avgResponseMin: 2.5, ackRate: 100 },
  { day: "Sun", avgResponseMin: 2.7, ackRate: 97 },
];

const WARD_SUPPORT_COMPLETION = [
  { ward: "ICU", requested: 14, completed: 13 },
  { ward: "Emergency", requested: 22, completed: 20 },
  { ward: "Pediatrics", requested: 8, completed: 8 },
  { ward: "Surgery", requested: 11, completed: 10 },
  { ward: "General", requested: 9, completed: 9 },
];

function AnalyticsPage() {
  const [selectedWard, setSelectedWard] = useState("all");

  const handleExport = () => {
    toast.success("Workforce Relief Report exported to CSV!", {
      description: "Aggregated metrics anonymized in compliance with hospital policy.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] tracking-tight">Workforce Well-being & Operational Analytics</h2>
          <p className="text-xs text-[#64748B]">
            Aggregated patterns, notification acknowledgment speeds and relief delivery metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="h-8 rounded-xl border border-[#D9E0EB] bg-white px-3 text-xs font-semibold text-[#172033]"
          >
            <option value="all">All Hospital Wards</option>
            {WARDS.map((w) => (
              <option key={w} value={w}>{w} Ward</option>
            ))}
          </select>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-[#D9E0EB] text-xs font-bold text-[#172033]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-[#394BC5]" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E7EF] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#64748B] flex items-center justify-between">
            Ack Rate <CheckCircle2 className="h-4 w-4 text-[#16835E]" />
          </span>
          <p className="font-mono text-2xl md:text-3xl font-extrabold text-[#16835E] mt-1">96.2%</p>
          <p className="text-[10px] text-[#8E9FB8] mt-1">Within 5 mins of dispatch</p>
        </div>

        <div className="rounded-2xl border border-[#E2E7EF] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#64748B] flex items-center justify-between">
            Response Time <Clock className="h-4 w-4 text-[#394BC5]" />
          </span>
          <p className="font-mono text-2xl md:text-3xl font-extrabold text-[#394BC5] mt-1">3.1 min</p>
          <p className="text-[10px] text-[#8E9FB8] mt-1">Median time to relief</p>
        </div>

        <div className="rounded-2xl border border-[#E2E7EF] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#64748B] flex items-center justify-between">
            Support Completion <HeartHandshake className="h-4 w-4 text-[#B7791F]" />
          </span>
          <p className="font-mono text-2xl md:text-3xl font-extrabold text-[#172033] mt-1">93.8%</p>
          <p className="text-[10px] text-[#8E9FB8] mt-1">60 of 64 requests fulfilled</p>
        </div>

        <div className="rounded-2xl border border-[#E2E7EF] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#64748B] flex items-center justify-between">
            Telemetry Uptime <Wifi className="h-4 w-4 text-[#16835E]" />
          </span>
          <p className="font-mono text-2xl md:text-3xl font-extrabold text-[#16835E] mt-1">99.4%</p>
          <p className="text-[10px] text-[#8E9FB8] mt-1">Wearable transmission</p>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Strain by Shift Period */}
        <Card className="rounded-2xl border-[#E2E7EF] p-5 shadow-2xs bg-white">
          <CardHeader className="p-0 pb-3 border-b border-[#EEF2F7]">
            <CardTitle className="text-sm font-extrabold text-[#172033]">
              Aggregated Physiological Strain by Shift Time
            </CardTitle>
            <p className="text-xs text-[#64748B]">Distribution of normal, moderate, and elevated strain across shift hours</p>
          </CardHeader>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SHIFT_STRAIN_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="shift" stroke="#8E9FB8" fontSize={10} tickLine={false} />
                <YAxis stroke="#8E9FB8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="normal" name="Normal" fill="#16835E" stackId="a" radius={[0, 0, 4, 4]} />
                <Bar dataKey="moderate" name="Moderate Strain" fill="#B7791F" stackId="a" />
                <Bar dataKey="high" name="Elevated Strain" fill="#C24152" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Notification Acknowledgment Rate & Latency */}
        <Card className="rounded-2xl border-[#E2E7EF] p-5 shadow-2xs bg-white">
          <CardHeader className="p-0 pb-3 border-b border-[#EEF2F7]">
            <CardTitle className="text-sm font-extrabold text-[#172033]">
              Supervisor Response Latency & Mobile Ack Rate
            </CardTitle>
            <p className="text-xs text-[#64748B]">Daily median minutes to relief response vs mobile acknowledgment %</p>
          </CardHeader>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RESPONSE_LATENCY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" stroke="#8E9FB8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#394BC5" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[80, 100]} stroke="#16835E" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="avgResponseMin" name="Avg Response (min)" stroke="#394BC5" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="ackRate" name="Ack Rate (%)" stroke="#16835E" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Ethical Statement Footer */}
      <div className="rounded-2xl border border-[#C9F3DD] bg-[#E1F4E9]/40 p-4 text-xs text-[#142039] flex items-start gap-3">
        <Info className="h-4 w-4 shrink-0 text-[#16835E] mt-0.5" />
        <p className="leading-relaxed">
          <strong>Responsible Healthcare Workforce Policy:</strong> WeCare does not compile individual performance rankings or punitive scores based on physiological data. Analytics are aggregated for staffing adequacy, break scheduling, and institutional support planning.
        </p>
      </div>
    </div>
  );
}
