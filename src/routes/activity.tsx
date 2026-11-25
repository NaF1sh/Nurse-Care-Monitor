import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartHandshake,
  History,
  MessageSquare,
  ShieldCheck,
  User,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore, fmtTimeSec } from "@/lib/store";
import { useActions } from "@/lib/queries";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity History & Audit Trail — NurseCare Monitor" },
      { name: "description", content: "Chronological audit log of physiological alerts, dispatched messages and supervisor interventions." },
      { property: "og:title", content: "Activity History & Audit Trail — NurseCare Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Activity History">
      <ActivityPage />
    </AppShell>
  ),
});

interface ActivityEvent {
  id: string;
  time: string;
  type: "alert" | "notification" | "support" | "action" | "device";
  title: string;
  detail: string;
  actor: string;
  status: "completed" | "in_progress" | "alert";
}

function ActivityPage() {
  const { notifications, supportRequests } = useStore();
  const actionsQuery = useActions();
  const actions = actionsQuery.data ?? [];
  const [filterType, setFilterType] = useState<string>("all");

  // Compile combined events
  const events: ActivityEvent[] = [
    ...notifications.map((n) => ({
      id: n.id,
      time: n.sentAt,
      type: "notification" as const,
      title: `Dispatched to ${n.recipients.join(", ")}`,
      detail: n.message,
      actor: "Lead Supervisor",
      status: (n.status === "acknowledged" ? "completed" : "in_progress") as "completed" | "in_progress",
    })),
    ...supportRequests.map((sr) => ({
      id: sr.id,
      time: sr.createdAt,
      type: "support" as const,
      title: `${sr.nurseName} requested ${sr.type.replace("_", " ")}`,
      detail: `Assigned in ${sr.ward} Ward: ${sr.notes || "Relief coverage requested."}`,
      actor: sr.assignedTo || "Unassigned",
      status: (sr.status === "completed" ? "completed" : "in_progress") as "completed" | "in_progress",
    })),
    ...actions.map((a) => ({
      id: a.id,
      time: a.created_at,
      type: "action" as const,
      title: `Supervisor action logged: ${a.action_type}`,
      detail: a.note || "Intervention logged without additional note.",
      actor: "Supervisor",
      status: "completed" as const,
    })),
    {
      id: "EVT-01",
      time: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      type: "alert",
      title: "Elevated physiological strain flag (N-001 ICU)",
      detail: "Heart rate sustained above baseline (+22 bpm, low motion).",
      actor: "Classical ML Model v1.2",
      status: "alert",
    },
    {
      id: "EVT-02",
      time: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      type: "device",
      title: "Smartwatch Telemetry Active",
      detail: "Galaxy Watch4 paired and 4 Hz stream validated across all duty nurses.",
      actor: "Device Bridge",
      status: "completed",
    },
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const filtered = events.filter((e) => filterType === "all" || e.type === filterType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#08242d] tracking-tight">Clinical Activity Timeline & Audit Trail</h2>
          <p className="text-xs text-[#64748B]">
            Verifiable chronological log of alerts, check-ins, messages, relief assignments and outcomes.
          </p>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-8 rounded-xl border border-[#D9E0EB] bg-white px-3 text-xs font-semibold text-[#08242d]"
        >
          <option value="all">All Event Types</option>
          <option value="alert">Physiological Strain Alerts</option>
          <option value="notification">Dispatched Notifications</option>
          <option value="support">Support Coordination</option>
          <option value="action">Supervisor Actions</option>
        </select>
      </div>

      <Card className="rounded-2xl border-[#E2E7EF] p-6 shadow-2xs bg-white">
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#EEF2F7]">
          {filtered.map((item) => (
            <div key={item.id} className="relative flex items-start gap-4 pl-1">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-white ring-4 ring-white shrink-0 ${
                  item.type === "alert"
                    ? "bg-[#C24152]"
                    : item.type === "notification"
                    ? "bg-[#005859]"
                    : item.type === "support"
                    ? "bg-[#B7791F]"
                    : "bg-[#16835E]"
                }`}
              >
                {item.type === "alert" && <AlertTriangle className="h-3 w-3" />}
                {item.type === "notification" && <MessageSquare className="h-3 w-3" />}
                {item.type === "support" && <HeartHandshake className="h-3 w-3" />}
                {item.type === "action" && <CheckCircle2 className="h-3 w-3" />}
                {item.type === "device" && <Wifi className="h-3 w-3" />}
              </span>

              <div className="flex-1 rounded-xl border border-[#E2E7EF] bg-[#F8FAFC] p-4 text-xs transition-all hover:bg-white hover:border-[#D9E0EB] hover:shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h4 className="font-extrabold text-[#08242d] text-sm">{item.title}</h4>
                  <span className="font-mono text-[11px] text-[#8E9FB8]">{fmtTimeSec(item.time)}</span>
                </div>
                <p className="mt-1 text-xs text-[#64748B] leading-relaxed">{item.detail}</p>
                <div className="mt-2.5 flex items-center justify-between border-t border-[#EEF2F7] pt-2 text-[11px]">
                  <span className="text-[#8E9FB8]">
                    Actor: <strong className="text-[#08242d]">{item.actor}</strong>
                  </span>
                  <span
                    className={`font-extrabold capitalize ${
                      item.status === "completed"
                        ? "text-[#16835E]"
                        : item.status === "alert"
                        ? "text-[#C24152]"
                        : "text-[#B7791F]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
