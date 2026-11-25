import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartHandshake,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, StressBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLatestPredictions, useNurses } from "@/lib/queries";
import { fmtTime, isStale, useStore, WARDS, type StressLevel } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Supervisor Overview — Nurse Care Monitor" },
      { name: "description", content: "Intelligent nurse monitoring and workforce coordination dashboard." },
      { property: "og:title", content: "Supervisor Overview — Nurse Care Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Spot nurse strain early. Support teams sooner." },
    ],
  }),
  component: () => (
    <AppShell title="Supervisor Overview">
      <Dashboard />
    </AppShell>
  ),
});

// Physiological context for each demonstration nurse
const ACTIVITY_CONTEXT: Record<
  string,
  {
    role: string;
    shift: string;
    hr: number;
    eda: string;
    context: string;
    device: "online" | "replay" | "offline";
    lastSeen: string;
    sparkline: number[];
  }
> = {
  "N-001": {
    role: "Senior Staff Nurse",
    shift: "Morning (07:00–15:30)",
    hr: 98,
    eda: "3.4 µS (+42%)",
    context: "Trauma ICU intake, prolonged high exertion",
    device: "online",
    lastSeen: "Just now",
    sparkline: [78, 82, 85, 91, 95, 98],
  },
  "N-002": {
    role: "Clinical Specialist",
    shift: "Morning (07:00–15:30)",
    hr: 72,
    eda: "1.2 µS (baseline)",
    context: "Triage assessment, stable physiological state",
    device: "online",
    lastSeen: "12s ago",
    sparkline: [70, 71, 73, 72, 74, 72],
  },
  "N-003": {
    role: "Staff Nurse",
    shift: "Day (08:00–16:30)",
    hr: 70,
    eda: "1.1 µS (baseline)",
    context: "Pediatric ward rounds, steady vitals",
    device: "online",
    lastSeen: "28s ago",
    sparkline: [68, 69, 71, 70, 70, 70],
  },
  "N-004": {
    role: "Registered Nurse",
    shift: "Morning (07:00–15:30)",
    hr: 84,
    eda: "2.1 µS (+15%)",
    context: "Post-op medication round, moderate cognitive load",
    device: "online",
    lastSeen: "45s ago",
    sparkline: [74, 76, 80, 82, 81, 84],
  },
  "N-005": {
    role: "Night Charge Nurse",
    shift: "Night (23:00–07:30)",
    hr: 64,
    eda: "0.9 µS (baseline)",
    context: "Shift handover completed, device resting in dock",
    device: "offline",
    lastSeen: "42m ago",
    sparkline: [66, 65, 64, 64, 63, 64],
  },
};

function MiniSparkline({ data, alert }: { data: number[]; alert?: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 18;
  const width = 56;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible inline-block">
      <polyline
        fill="none"
        stroke={alert ? "#C24152" : "#244D45"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function Dashboard() {
  const t = useT();
  const navigate = useNavigate();
  const { user, activeWard, setActiveWard, notifications, addNotification, supportRequests } = useStore();
  const nurses = useNurses();
  const preds = useLatestPredictions();

  // Filters & selection
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Notification Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [notifCategory, setNotifCategory] = useState<"check_in" | "assistance" | "break_coverage" | "announcement" | "supervisor_msg">("check_in");

  if (nurses.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-[#64766E]">
          <RefreshCw className="h-4 w-4 animate-spin text-[#244D45]" />
          Loading clinical overview…
        </div>
      </div>
    );
  }

  const allNurses = (nurses.data ?? []).filter((n) => n.is_active);
  const rows = allNurses.map((n) => ({
    n,
    p: preds.data?.get(n.id) || preds.data?.get(n.nurse_code),
    meta: ACTIVITY_CONTEXT[n.nurse_code] || {
      role: "Staff Nurse",
      shift: "Day Shift",
      hr: 74,
      eda: "1.0 µS",
      context: "Standard clinical care",
      device: "online" as const,
      lastSeen: "Just now",
      sparkline: [70, 72, 73, 74, 75, 74],
    },
  }));

  const filtered = rows.filter(({ n, p }) => {
    const matchesWard = activeWard === "all" || n.ward === activeWard;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "high" && p?.stress_level === "high") ||
      (statusFilter === "moderate" && p?.stress_level === "moderate") ||
      (statusFilter === "normal" && p?.stress_level === "normal") ||
      (statusFilter === "offline" && ACTIVITY_CONTEXT[n.nurse_code]?.device === "offline");
    const matchesSearch =
      search === "" ||
      n.full_name.toLowerCase().includes(search.toLowerCase()) ||
      n.nurse_code.toLowerCase().includes(search.toLowerCase()) ||
      (n.ward || "").toLowerCase().includes(search.toLowerCase());
    return matchesWard && matchesStatus && matchesSearch;
  });

  const onDutyCount = rows.length;
  const activeMonitoredCount = rows.filter((r) => r.meta.device === "online").length;
  const elevatedStrainCount = rows.filter((r) => r.p?.stress_level === "high").length;
  const moderateStrainCount = rows.filter((r) => r.p?.stress_level === "moderate").length;
  const pendingRequestsCount = supportRequests.filter((s) => s.status === "pending").length;

  const toggleSelect = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCodes.size === filtered.length && filtered.length > 0) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filtered.map((r) => r.n.nurse_code)));
    }
  };

  const openDrawerForNurses = (codes: string[], templateText?: string) => {
    setSelectedCodes(new Set(codes));
    if (templateText) setMessageText(templateText);
    setDrawerOpen(true);
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCodes.size === 0) {
      toast.error("Please select at least one recipient.");
      return;
    }
    if (!messageText.trim()) {
      toast.error("Please write a notification message.");
      return;
    }

    const recipientNames = rows
      .filter((r) => selectedCodes.has(r.n.nurse_code))
      .map((r) => r.n.full_name);

    addNotification({
      recipients: recipientNames,
      category: notifCategory,
      priority: notifCategory === "check_in" ? "urgent" : "normal",
      subject: notifCategory === "check_in" ? "Supervisor Check-in Request" : "Team Notification",
      message: messageText.trim(),
      requiresAck: true,
    });

    toast.success(`Notification sent to ${recipientNames.length} recipient${recipientNames.length > 1 ? "s" : ""}.`, {
      description: "Delivered to mobile companion apps.",
    });

    setMessageText("");
    setDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Compact Shift Overview & Personalized Greeting */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] px-4 py-3.5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#192C28]">
              Good morning, {user?.full_name?.split(" ")[0] || "Dr. Rahman"}
            </h1>
            <span className="inline-flex items-center rounded-full bg-[#E6EFEA] px-2 py-0.5 text-[11px] font-medium text-[#244D45]">
              Active Shift
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#64766E]">
            Morning Shift (07:00–15:30) • Central Inpatient Wing • {activeMonitoredCount} wearable devices connected
          </p>
        </div>

        <div className="flex items-center gap-2">
          {elevatedStrainCount > 0 && (
            <button
              onClick={() => {
                const elevatedCodes = rows
                  .filter((r) => r.p?.stress_level === "high")
                  .map((r) => r.n.nurse_code);
                openDrawerForNurses(
                  elevatedCodes,
                  "Supervisor check-in: We noticed prolonged elevated physiological exertion. Would you like temporary relief coverage?"
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#FDE8EA] px-3 py-1.5 text-xs font-medium text-[#C24152] hover:bg-[#FCD2D6] transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{elevatedStrainCount} Nurse Needs Attention</span>
            </button>
          )}

          <Link
            to="/simulation"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E1E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#192C28] hover:bg-[#F7F8F5] transition-colors"
          >
            <Activity className="h-3.5 w-3.5 text-[#244D45]" />
            <span>AI Simulation</span>
          </Link>
        </div>
      </section>

      {/* 2. Focused Monitoring Statistics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* On Duty */}
        <button
          onClick={() => setStatusFilter("all")}
          className={cn(
            "rounded-lg border bg-[#FFFFFF] p-3.5 text-left transition-colors",
            statusFilter === "all" ? "border-[#244D45] ring-1 ring-[#244D45]" : "border-[#E1E6E1] hover:border-[#C6E2D6]"
          )}
        >
          <div className="text-[11px] font-medium text-[#64766E]">On Duty</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#192C28] font-mono tabular-nums">{onDutyCount}</span>
            <span className="text-[11px] text-[#64766E]">nurses</span>
          </div>
          <div className="mt-1 text-[11px] text-[#64766E]">{activeMonitoredCount} active telemetry</div>
        </button>

        {/* Normal Baseline */}
        <button
          onClick={() => setStatusFilter("normal")}
          className={cn(
            "rounded-lg border bg-[#FFFFFF] p-3.5 text-left transition-colors",
            statusFilter === "normal" ? "border-[#244D45] ring-1 ring-[#244D45]" : "border-[#E1E6E1] hover:border-[#C6E2D6]"
          )}
        >
          <div className="text-[11px] font-medium text-[#244D45] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#244D45]" />
            <span>Normal Range</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#244D45] font-mono tabular-nums">
              {rows.filter((r) => r.p?.stress_level === "normal" || (!r.p?.stress_level && r.meta.device === "online")).length}
            </span>
            <span className="text-[11px] text-[#64766E]">stable</span>
          </div>
          <div className="mt-1 text-[11px] text-[#64766E]">Within baseline physiological thresholds</div>
        </button>

        {/* Moderate Strain */}
        <button
          onClick={() => setStatusFilter("moderate")}
          className={cn(
            "rounded-lg border bg-[#FFFFFF] p-3.5 text-left transition-colors",
            statusFilter === "moderate" ? "border-[#B7791F] ring-1 ring-[#B7791F]" : "border-[#E1E6E1] hover:border-[#B7791F]"
          )}
        >
          <div className="text-[11px] font-medium text-[#B7791F] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B7791F]" />
            <span>Moderate Exertion</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#B7791F] font-mono tabular-nums">{moderateStrainCount}</span>
            <span className="text-[11px] text-[#64766E]">monitored</span>
          </div>
          <div className="mt-1 text-[11px] text-[#64766E]">Elevated task pace, within tolerance</div>
        </button>

        {/* Elevated Strain */}
        <button
          onClick={() => setStatusFilter("high")}
          className={cn(
            "rounded-lg border bg-[#FFFFFF] p-3.5 text-left transition-colors",
            statusFilter === "high" ? "border-[#C24152] ring-1 ring-[#C24152]" : "border-[#E1E6E1] hover:border-[#C24152]"
          )}
        >
          <div className="text-[11px] font-medium text-[#C24152] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C24152]" />
            <span>Elevated Strain</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#C24152] font-mono tabular-nums">{elevatedStrainCount}</span>
            <span className="text-[11px] text-[#C24152] font-medium">attention</span>
          </div>
          <div className="mt-1 text-[11px] text-[#64766E]">Recommend supervisor check-in</div>
        </button>
      </div>

      {/* 3. Main Operational Workspace: Attio/Linear-style Nurse Monitoring Table */}
      <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] shadow-xs overflow-hidden">
        {/* Table Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 border-b border-[#E1E6E1]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#192C28]">Nurse Monitoring Table</h2>
            <span className="text-xs text-[#64766E]">({filtered.length} nurses)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#64766E]" />
              <Input
                placeholder="Filter by name, ID or ward…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 pl-7 text-xs bg-[#FFFFFF] rounded-md border-[#E1E6E1] focus-visible:ring-1 focus-visible:ring-[#244D45]"
              />
            </div>

            {/* Ward Selector */}
            <select
              value={activeWard}
              onChange={(e) => setActiveWard(e.target.value)}
              className="h-7 rounded-md border border-[#E1E6E1] bg-[#FFFFFF] px-2 text-xs font-medium text-[#192C28] cursor-pointer outline-hidden"
            >
              <option value="all">All Wards</option>
              {WARDS.map((w) => (
                <option key={w} value={w}>
                  {w} Ward
                </option>
              ))}
            </select>

            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 rounded-md border border-[#E1E6E1] bg-[#FFFFFF] px-2 text-xs font-medium text-[#192C28] cursor-pointer outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="high">Elevated Strain</option>
              <option value="moderate">Moderate</option>
              <option value="normal">Normal</option>
              <option value="offline">Offline</option>
            </select>

            {/* Action Bar when Nurses are Selected */}
            {selectedCodes.size > 0 ? (
              <Button
                size="sm"
                onClick={() => setDrawerOpen(true)}
                className="h-7 px-3 text-xs font-medium bg-[#244D45] text-white hover:bg-[#1b3d36]"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Notify Selected ({selectedCodes.size})
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openDrawerForNurses(rows.map((r) => r.n.nurse_code))}
                className="h-7 px-2.5 text-xs font-medium text-[#192C28] border-[#E1E6E1] hover:bg-[#F7F8F5]"
              >
                Notify Staff
              </Button>
            )}
          </div>
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E1E6E1] bg-[#FAFBF9] text-[#64766E] font-medium">
                <th className="py-2.5 px-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={selectedCodes.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-[#D9DFD9] text-[#244D45] focus:ring-[#244D45]"
                  />
                </th>
                <th className="py-2.5 px-3 font-medium">Nurse</th>
                <th className="py-2.5 px-3 font-medium">Ward</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Heart Rate</th>
                <th className="py-2.5 px-3 font-medium">Electrodermal (EDA)</th>
                <th className="py-2.5 px-3 font-medium">Trend</th>
                <th className="py-2.5 px-3 font-medium">Telemetry</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E6E1]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#64766E]">
                    No nurses found matching the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map(({ n, p, meta }) => {
                  const isSelected = selectedCodes.has(n.nurse_code);
                  const isHigh = p?.stress_level === "high";

                  return (
                    <tr
                      key={n.id}
                      className={cn(
                        "transition-colors",
                        isSelected ? "bg-[#EFF3F0]" : "hover:bg-[#FAFBF9]",
                        isHigh && !isSelected ? "bg-[#FDE8EA]/30" : ""
                      )}
                    >
                      <td className="py-3 px-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(n.nurse_code)}
                          className="rounded border-[#D9DFD9] text-[#244D45] focus:ring-[#244D45]"
                        />
                      </td>

                      {/* Nurse Column */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold shrink-0",
                              isHigh ? "bg-[#FDE8EA] text-[#C24152]" : "bg-[#EFF3F0] text-[#244D45]"
                            )}
                          >
                            {n.full_name
                              .split(" ")
                              .filter(Boolean)
                              .map((x) => x[0])
                              .slice(-2)
                              .join("")}
                          </div>
                          <div>
                            <Link
                              to="/nurses/$id"
                              params={{ id: n.id }}
                              className="font-medium text-[#192C28] hover:text-[#244D45] hover:underline"
                            >
                              {n.full_name}
                            </Link>
                            <div className="text-[11px] text-[#64766E]">
                              <span className="font-mono">{n.nurse_code}</span> • {meta.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ward */}
                      <td className="py-3 px-3">
                        <span className="text-[#192C28] font-medium">{n.ward ?? "Unassigned"}</span>
                      </td>

                      {/* Strain Status */}
                      <td className="py-3 px-3">
                        <StressBadge level={p?.stress_level} stale={!!p && isStale(p.created_at)} />
                      </td>

                      {/* Heart Rate */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-xs text-[#192C28] tabular-nums">
                          {meta.device === "offline" ? (
                            <span className="text-[#A5B2AC]">—</span>
                          ) : (
                            <>
                              <span className="font-medium">{meta.hr}</span>{" "}
                              <span className="text-[10px] text-[#64766E]">bpm</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* EDA */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] text-[#64766E]">
                          {meta.device === "offline" ? "—" : meta.eda}
                        </span>
                      </td>

                      {/* Physiological Trend Sparkline */}
                      <td className="py-3 px-3">
                        {meta.device === "offline" ? (
                          <span className="text-[10px] text-[#A5B2AC]">Docked</span>
                        ) : (
                          <MiniSparkline data={meta.sparkline} alert={isHigh} />
                        )}
                      </td>

                      {/* Telemetry / Device */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {meta.device === "online" ? (
                            <span className="inline-flex items-center gap-1 text-[#244D45]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#244D45]" />
                              <span>Live ({meta.lastSeen})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#64766E]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#A5B2AC]" />
                              <span>Offline ({meta.lastSeen})</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              openDrawerForNurses(
                                [n.nurse_code],
                                `Hi ${n.full_name.split(" ")[0]}, supervisor checking in. How are things going in ${n.ward}?`
                              )
                            }
                            className="rounded px-2 py-1 text-[11px] font-medium text-[#244D45] hover:bg-[#EFF3F0] transition-colors"
                          >
                            Notify
                          </button>
                          <Link
                            to="/nurses/$id"
                            params={{ id: n.id }}
                            className="rounded px-2 py-1 text-[11px] font-medium text-[#64766E] hover:text-[#192C28] hover:bg-[#EFF3F0] transition-colors"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between border-t border-[#E1E6E1] px-4 py-2.5 text-xs text-[#64766E] bg-[#FAFBF9]">
          <span>
            Displaying {filtered.length} of {rows.length} nurses
          </span>
          {selectedCodes.size > 0 && (
            <span className="text-[#244D45] font-medium">
              {selectedCodes.size} nurse{selectedCodes.size === 1 ? "" : "s"} selected
            </span>
          )}
        </div>
      </div>

      {/* 4. Compact Activity Timeline & Unresolved Support Needs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unresolved Support & Assistance Requests */}
        <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E1E6E1]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#192C28]">
              <HeartHandshake className="h-4 w-4 text-[#244D45]" />
              <span>Unresolved Support & Coverage Needs</span>
            </div>
            <Link to="/support" className="text-[11px] font-medium text-[#244D45] hover:underline">
              View all ({supportRequests.length})
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#E1E6E1]">
            {supportRequests.length === 0 ? (
              <p className="py-4 text-xs text-[#64766E]">No active support requests.</p>
            ) : (
              supportRequests.slice(0, 3).map((sr) => (
                <div key={sr.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-[#192C28]">
                      {sr.nurseName} • <span className="capitalize">{sr.type.replace("_", " ")}</span>
                    </p>
                    <p className="text-[11px] text-[#64766E]">{sr.notes || "Coverage assistance needed"}</p>
                  </div>
                  <Link
                    to="/support"
                    className="rounded-md border border-[#E1E6E1] px-2.5 py-1 text-[11px] font-medium text-[#192C28] hover:bg-[#F7F8F5]"
                  >
                    Resolve
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Coordination Dispatch Timeline */}
        <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E1E6E1]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#192C28]">
              <Clock className="h-4 w-4 text-[#244D45]" />
              <span>Recent Dispatched Notifications</span>
            </div>
            <Link to="/notifications" className="text-[11px] font-medium text-[#244D45] hover:underline">
              Full log ({notifications.length})
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#E1E6E1]">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#244D45] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#192C28] truncate">{n.recipients.join(", ")}</span>
                    <span className="text-[10px] capitalize text-[#64766E]">{n.status}</span>
                  </div>
                  <p className="text-[11px] text-[#64766E] truncate mt-0.5">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Animated Slide-Out Notification Composer Drawer (Radix / Sheet) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#FFFFFF] border-l border-[#E1E6E1] p-6 flex flex-col justify-between">
          <div>
            <SheetHeader className="text-left pb-4 border-b border-[#E1E6E1]">
              <SheetTitle className="text-base font-semibold text-[#192C28] flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#244D45]" />
                Send Staff Notification
              </SheetTitle>
              <SheetDescription className="text-xs text-[#64766E]">
                Dispatches targeted alerts directly to nurse mobile companion phones.
              </SheetDescription>
            </SheetHeader>

            <form id="drawer-notif-form" onSubmit={handleSendNotification} className="mt-5 space-y-4">
              {/* Selected Staff */}
              <div>
                <label className="block text-xs font-medium text-[#192C28] mb-1.5">
                  Recipients ({selectedCodes.size})
                </label>
                <div className="min-h-11 rounded-md border border-[#E1E6E1] bg-[#FAFBF9] p-2 text-xs">
                  {selectedCodes.size === 0 ? (
                    <span className="text-[#8A9A92] italic">
                      No nurses selected. Choose from the roster or select all.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {Array.from(selectedCodes).map((code) => {
                        const nurseObj = rows.find((r) => r.n.nurse_code === code)?.n;
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 rounded bg-[#E6EFEA] px-2 py-0.5 text-xs font-medium text-[#244D45]"
                          >
                            <span>{nurseObj?.full_name?.split(" ")[0] || code}</span>
                            <button
                              type="button"
                              onClick={() => toggleSelect(code)}
                              className="text-[#244D45] hover:text-[#C24152]"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Category */}
              <div>
                <label className="block text-xs font-medium text-[#192C28] mb-1.5">
                  Category & Intent
                </label>
                <select
                  value={notifCategory}
                  onChange={(e) => setNotifCategory(e.target.value as typeof notifCategory)}
                  className="w-full h-8 rounded-md border border-[#E1E6E1] bg-[#FFFFFF] px-2.5 text-xs text-[#192C28] outline-hidden cursor-pointer"
                >
                  <option value="check_in">Supervisor Check-in (Elevated Strain)</option>
                  <option value="break_coverage">Break Coverage Coordination</option>
                  <option value="assistance">Clinical Assistance Request</option>
                  <option value="supervisor_msg">Direct Message</option>
                  <option value="announcement">Ward Announcement</option>
                </select>
              </div>

              {/* Quick Preset Templates */}
              <div>
                <span className="block text-[11px] font-medium text-[#64766E] mb-1">
                  Preset Templates:
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setMessageText(
                        "Hi, supervisor checking in. We noticed elevated exertion in your ward. How are you feeling?"
                      )
                    }
                    className="rounded border border-[#E1E6E1] bg-[#FAFBF9] px-2 py-1 text-[11px] text-[#192C28] hover:border-[#244D45]"
                  >
                    Check In
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMessageText(
                        "Your requested 15-minute break coverage has been approved and assigned."
                      )
                    }
                    className="rounded border border-[#E1E6E1] bg-[#FAFBF9] px-2 py-1 text-[11px] text-[#192C28] hover:border-[#244D45]"
                  >
                    Break Approved
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMessageText(
                        "Assistance requested in Room 304 for urgent patient repositioning."
                      )
                    }
                    className="rounded border border-[#E1E6E1] bg-[#FAFBF9] px-2 py-1 text-[11px] text-[#192C28] hover:border-[#244D45]"
                  >
                    Ward Assistance
                  </button>
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label htmlFor="drawer-msg" className="block text-xs font-medium text-[#192C28] mb-1.5">
                  Message Body
                </label>
                <textarea
                  id="drawer-msg"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="Type instructions or check-in request…"
                  className="w-full rounded-md border border-[#E1E6E1] bg-[#FFFFFF] p-2.5 text-xs text-[#192C28] outline-hidden focus:border-[#244D45] focus:ring-1 focus:ring-[#244D45]"
                />
                <span className="text-[10px] text-[#8A9A92] block text-right">
                  {messageText.length} / 300 characters
                </span>
              </div>
            </form>

            {/* Mobile Companion Phone Preview inside Drawer */}
            <div className="mt-5 rounded-lg border border-[#E1E6E1] bg-[#FAFBF9] p-3">
              <div className="flex items-center justify-between text-[10px] text-[#64766E] mb-2">
                <span className="font-medium flex items-center gap-1">
                  <Smartphone className="h-3 w-3 text-[#244D45]" /> Companion Notification Preview
                </span>
                <span>Android OS</span>
              </div>
              <div className="rounded-md border border-[#E1E6E1] bg-[#FFFFFF] p-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-[#244D45]">Nurse Care Monitor</span>
                  <span className="text-[#8A9A92]">Now</span>
                </div>
                <p className="mt-1 text-xs font-medium text-[#192C28]">
                  {notifCategory === "check_in" ? "Supervisor Check-in" : "Hospital Coordination"}
                </p>
                <p className="mt-0.5 text-[11px] text-[#64766E] leading-relaxed break-words">
                  {messageText || "Please check in with your current availability and status."}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E1E6E1] flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              className="text-xs border-[#E1E6E1]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="drawer-notif-form"
              disabled={selectedCodes.size === 0 || !messageText.trim()}
              className="bg-[#244D45] hover:bg-[#1b3d36] text-white text-xs font-medium"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Dispatch Notification
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
export default Dashboard;
