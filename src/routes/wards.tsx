import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  HeartHandshake,
  MessageSquare,
  Users,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useStore, WARDS } from "@/lib/store";
import { useNurses, useLatestPredictions } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wards")({
  head: () => ({
    meta: [
      { title: "Ward Management & Workforce Capacity — NurseCare Monitor" },
      { name: "description", content: "Hospital ward status, assigned staff, active wearable monitoring and assistance requests." },
      { property: "og:title", content: "Ward Management & Workforce Capacity — NurseCare Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Ward Management">
      <WardsPage />
    </AppShell>
  ),
});

const WARD_METRICS: Record<string, { capacity: number; shiftLead: string; specialty: string }> = {
  ICU: { capacity: 16, shiftLead: "Dr. Anika Rahman", specialty: "Critical Care & Trauma" },
  Emergency: { capacity: 28, shiftLead: "Dr. Tariq Hasan", specialty: "Emergency & Triage" },
  Pediatrics: { capacity: 20, shiftLead: "Charge Nurse David", specialty: "Infant & Child Health" },
  Surgery: { capacity: 14, shiftLead: "Dr. Rezaul Karim", specialty: "Pre/Post-Operative" },
  General: { capacity: 32, shiftLead: "Staff Lead Kabir", specialty: "Inpatient Internal Medicine" },
};

function WardsPage() {
  const { setActiveWard, addNotification, supportRequests } = useStore();
  const nursesQuery = useNurses();
  const predsQuery = useLatestPredictions();
  const nurses = nursesQuery.data ?? [];
  const preds = predsQuery.data;

  const handleBroadcastWard = (wardName: string) => {
    addNotification({
      recipients: [`${wardName} Ward Staff`],
      category: "announcement",
      priority: "normal",
      subject: `Supervisor Broadcast to ${wardName} Ward`,
      message: `Supervisor update for ${wardName} Ward. Please maintain standard shift reporting and notify if break coverage is required.`,
      requiresAck: false,
    });
    toast.success(`Broadcast message sent to all personnel in ${wardName} Ward.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Overview */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#08242d]">Hospital Wards & Clinical Units</h1>
          <p className="text-xs text-[#64766E] mt-0.5">
            Workforce distribution, monitoring coverage and pending relief needs across 5 inpatient wards.
          </p>
        </div>
        <Button
          onClick={() => {
            addNotification({
              recipients: ["All Wards"],
              category: "announcement",
              priority: "normal",
              subject: "Hospital-wide Shift Announcement",
              message: "Mid-shift check-in: float nurses are available in Central Wing if any ward requires temporary relief.",
              requiresAck: false,
            });
            toast.success("Broadcast dispatched to all hospital wards.");
          }}
          className="h-7 rounded-md bg-[#005859] hover:bg-[#1b3d36] text-xs font-medium text-white shadow-xs"
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Broadcast Hospital-wide
        </Button>
      </div>

      {/* Ward Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {WARDS.map((ward) => {
          const wardNurses = nurses.filter((n) => n.ward === ward);
          const meta = WARD_METRICS[ward] || { capacity: 20, shiftLead: "Staff Supervisor", specialty: "General Care" };
          const highCount = wardNurses.filter((n) => preds?.get(n.id)?.stress_level === "high" || preds?.get(n.nurse_code)?.stress_level === "high").length;
          const pendingWardRequests = supportRequests.filter((s) => s.ward === ward && s.status === "pending").length;

          return (
            <div key={ward} className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E1E6E1]">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-[#edf5f4] text-[#005859]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#08242d]">{ward} Ward</h2>
                      <p className="text-[11px] text-[#64766E]">{meta.specialty}</p>
                    </div>
                  </div>
                  <span className="rounded bg-[#edf5f4] px-2 py-0.5 text-[11px] font-mono text-[#64766E]">
                    Cap: {meta.capacity}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border border-[#E1E6E1] bg-[#FAFBF9] p-2">
                    <span className="text-[10px] font-medium text-[#64766E] uppercase">Staff</span>
                    <p className="font-mono text-sm font-semibold text-[#08242d] mt-0.5">{wardNurses.length}</p>
                  </div>
                  <div className="rounded-md border border-[#E1E6E1] bg-[#FAFBF9] p-2">
                    <span className="text-[10px] font-medium text-[#64766E] uppercase">Monitored</span>
                    <p className="font-mono text-sm font-semibold text-[#005859] mt-0.5">{wardNurses.length}</p>
                  </div>
                  <div className={cn("rounded-md border p-2", highCount > 0 ? "border-[#C24152]/30 bg-[#FDE8EA]/50" : "border-[#E1E6E1] bg-[#FAFBF9]")}>
                    <span className={cn("text-[10px] font-medium uppercase", highCount > 0 ? "text-[#C24152]" : "text-[#64766E]")}>Elevated</span>
                    <p className={cn("font-mono text-sm font-semibold mt-0.5", highCount > 0 ? "text-[#C24152]" : "text-[#08242d]")}>{highCount}</p>
                  </div>
                </div>

                {/* Staff Roster Snapshot */}
                <div className="mt-3.5">
                  <span className="text-[11px] font-medium text-[#64766E] block mb-1.5">Assigned On-Duty Staff:</span>
                  <div className="space-y-1">
                    {wardNurses.length === 0 ? (
                      <p className="text-xs text-[#8A9A92] italic py-1">No nurses assigned</p>
                    ) : (
                      wardNurses.map((n) => (
                        <div key={n.id} className="flex items-center justify-between text-xs py-1 border-b border-[#F5F7F5]">
                          <span className="font-medium text-[#08242d]">{n.full_name}</span>
                          <span className="text-[11px] font-mono text-[#64766E]">{n.nurse_code}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-[#E1E6E1] flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBroadcastWard(ward)}
                  className="flex-1 h-7 rounded-md text-xs font-medium text-[#08242d] border-[#E1E6E1] hover:bg-[#F4F8F8]"
                >
                  <MessageSquare className="mr-1 h-3.5 w-3.5 text-[#005859]" /> Broadcast
                </Button>
                <Button
                  size="sm"
                  asChild
                  onClick={() => setActiveWard(ward)}
                  className="flex-1 h-7 rounded-md bg-[#005859] hover:bg-[#1b3d36] text-xs font-medium text-white"
                >
                  <Link to="/dashboard">
                    View Roster <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
