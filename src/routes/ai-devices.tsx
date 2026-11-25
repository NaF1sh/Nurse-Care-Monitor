import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Battery,
  BatteryCharging,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Gauge,
  Layers,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Watch,
  Wifi,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/ai-devices")({
  head: () => ({
    meta: [
      { title: "AI Intelligence & Device Architecture — Nurse Care Monitor" },
      { name: "description", content: "Clinical ML pipeline, WESAD/NURSE datasets, 7.5-min calibration, and wearable device telemetry." },
      { property: "og:title", content: "AI Intelligence & Device Architecture — Nurse Care Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="AI & Device Architecture">
      <AiDevicesPage />
    </AppShell>
  ),
});

const AI_PIPELINE = [
  { step: "01", title: "Wearable Sampling", tech: "Smartwatch API", desc: "4 Hz continuous sampling of PPG (HR), electrodermal activity (EDA), skin temperature, and 3-axis motion." },
  { step: "02", title: "Preprocessing & Quality", tech: "Bandpass Filtering", desc: "Signal-to-noise validation, motion artifact scrubbing, and sensor dropout rejection." },
  { step: "03", title: "Feature Extraction", tech: "60s Sliding Window", desc: "Mean, standard deviation, slope, spectral energy, and frequency band ratios calculated over rolling 60s windows." },
  { step: "04", title: "Personal Calibration", tech: "7.5-min Baseline", desc: "Individualized baseline subtraction: accounts for distinct resting heart rates, medication, and baseline conductance." },
  { step: "05", title: "Inference Engine", tech: "Classical Production ML", desc: "Trained Random Forest classifier computes calibrated probability of sustained physiological strain." },
  { step: "06", title: "OOD & Alert Shield", tech: "Confidence Filter", desc: "Out-of-distribution gate verifies whether sample resembles valid training domains before surfacing alerts." },
  { step: "07", title: "Human Coordination", tech: "Companion Mobile Dispatch", desc: "Private check-in sent to nurse; supervisor coordinates peer relief with human approval." },
];

const DEVICE_FLEET = [
  { id: "DEV-W4-01", model: "Samsung Galaxy Watch4", nurse: "Demo Nurse Ayesha", ward: "ICU", battery: 84, status: "online", mode: "4 Hz Stream" },
  { id: "DEV-W4-02", model: "Samsung Galaxy Watch4", nurse: "Demo Nurse Rahim", ward: "Emergency", battery: 76, status: "online", mode: "4 Hz Stream" },
  { id: "DEV-W4-03", model: "Samsung Galaxy Watch4", nurse: "Demo Nurse Fatema", ward: "Pediatrics", battery: 92, status: "online", mode: "4 Hz Stream" },
  { id: "DEV-W4-04", model: "Samsung Galaxy Watch4", nurse: "Demo Nurse Karim", ward: "Surgery", battery: 68, status: "online", mode: "4 Hz Stream" },
  { id: "DEV-W4-05", model: "Samsung Galaxy Watch4", nurse: "Demo Nurse Salma", ward: "General", battery: 0, status: "offline", mode: "Dataset Replay" },
];

function AiDevicesPage() {
  return (
    <div className="space-y-6">
      {/* Top Title & Quick Link to Simulation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] tracking-tight">AI Model Intelligence & Wearable Fleet</h2>
          <p className="text-xs text-[#64748B]">
            Engine architecture, training datasets, personal baseline calibration mechanics, and device telemetry.
          </p>
        </div>
        <Button asChild className="h-8 rounded-xl bg-[#394BC5] hover:bg-[#303eaa] text-xs font-bold text-white">
          <Link to="/simulation">
            <Gauge className="mr-1.5 h-3.5 w-3.5" /> Open Interactive AI Simulation
          </Link>
        </Button>
      </div>

      {/* Model Spec Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-[#E2E7EF] p-4 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span>Model Version</span>
            <Cpu className="h-4 w-4 text-[#394BC5]" />
          </div>
          <p className="mt-2 font-mono text-xl font-extrabold text-[#172033]">v1.2-classical</p>
          <p className="mt-1 text-[11px] text-[#64748B]">Classical Random Forest + Scikit-Learn</p>
        </Card>

        <Card className="rounded-2xl border-[#E2E7EF] p-4 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span>Personal Calibration</span>
            <Clock className="h-4 w-4 text-[#16835E]" />
          </div>
          <p className="mt-2 font-mono text-xl font-extrabold text-[#16835E]">7.5 Minutes</p>
          <p className="mt-1 text-[11px] text-[#64748B]">Subject baseline normalization</p>
        </Card>

        <Card className="rounded-2xl border-[#E2E7EF] p-4 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span>Inference Latency</span>
            <Zap className="h-4 w-4 text-[#B7791F]" />
          </div>
          <p className="mt-2 font-mono text-xl font-extrabold text-[#172033]">~65 ms</p>
          <p className="mt-1 text-[11px] text-[#64748B]">Gradio Space API response</p>
        </Card>

        <Card className="rounded-2xl border-[#E2E7EF] p-4 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span>Training Datasets</span>
            <Database className="h-4 w-4 text-[#394BC5]" />
          </div>
          <p className="mt-2 font-mono text-xl font-extrabold text-[#394BC5]">NURSE + WESAD</p>
          <p className="mt-1 text-[11px] text-[#64748B]">Physiological ambulatory studies</p>
        </Card>
      </div>

      {/* AI Pipeline Visual Walkthrough */}
      <Card className="rounded-2xl border-[#E2E7EF] p-6 shadow-2xs bg-white">
        <div className="pb-4 border-b border-[#E2E7EF]">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#394BC5]">
            END-TO-END INTELLIGENCE PIPELINE
          </span>
          <h3 className="text-base font-extrabold text-[#172033]">
            How Nurse Care Monitor Translates Raw Wearable Signals Into Timely Relief
          </h3>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {AI_PIPELINE.map((stage) => (
            <div
              key={stage.step}
              className="rounded-2xl border border-[#E2E7EF] bg-[#F8FAFC] p-4 transition-all hover:border-[#394BC5] hover:shadow-xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[#394BC5]">
                <span className="font-mono text-sm font-black bg-[#E5E9FD] px-2 py-0.5 rounded-md">
                  {stage.step}
                </span>
                <span className="text-[10px] font-mono text-[#8E9FB8]">{stage.tech}</span>
              </div>
              <h4 className="mt-2.5 text-xs font-extrabold text-[#172033]">{stage.title}</h4>
              <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">{stage.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Wearable Fleet Management Table */}
      <Card className="rounded-2xl border-[#E2E7EF] shadow-2xs bg-white overflow-hidden">
        <div className="p-5 border-b border-[#E2E7EF]">
          <CardTitle className="text-base font-extrabold text-[#172033]">
            Smartwatch Device Fleet Telemetry
          </CardTitle>
          <p className="text-xs text-[#64748B]">
            Status of paired Samsung Galaxy Watch4 units, battery levels and synchronization modes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] text-[11px] font-extrabold uppercase text-[#64748B] border-b border-[#E2E7EF]">
                <th className="p-3.5 pl-5">Device ID</th>
                <th className="p-3.5">Hardware Model</th>
                <th className="p-3.5">Paired Nurse</th>
                <th className="p-3.5">Assigned Ward</th>
                <th className="p-3.5">Battery</th>
                <th className="p-3.5">Mode</th>
                <th className="p-3.5 pr-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {DEVICE_FLEET.map((dev) => (
                <tr key={dev.id} className="hover:bg-[#F8FAFC]">
                  <td className="p-3.5 pl-5 font-mono font-bold text-[#172033]">{dev.id}</td>
                  <td className="p-3.5 font-medium text-[#172033] flex items-center gap-2">
                    <Watch className="h-3.5 w-3.5 text-[#394BC5]" /> {dev.model}
                  </td>
                  <td className="p-3.5 font-bold text-[#172033]">{dev.nurse}</td>
                  <td className="p-3.5 font-semibold text-[#64748B]">{dev.ward}</td>
                  <td className="p-3.5 font-mono">
                    {dev.battery > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#172033]">
                        <Battery className="h-3.5 w-3.5 text-[#16835E]" /> {dev.battery}%
                      </span>
                    ) : (
                      <span className="text-[#8E9FB8]">—</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className="rounded-md bg-[#EEF2F7] px-2 py-0.5 text-[11px] font-bold text-[#172033]">
                      {dev.mode}
                    </span>
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        dev.status === "online" ? "bg-[#E1F4E9] text-[#16835E]" : "bg-[#EDF0F5] text-[#64748B]"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${dev.status === "online" ? "bg-[#16835E]" : "bg-[#64748B]"}`} />
                      {dev.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
