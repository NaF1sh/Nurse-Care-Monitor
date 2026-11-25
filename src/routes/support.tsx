import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useStore, type SupportRequest } from "@/lib/store";
import { useNurses } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Coordination & Workforce Relief — Nurse Care Monitor" },
      { name: "description", content: "11-step human-led support coordination workflow, peer assistance and break coverage." },
      { property: "og:title", content: "Support Coordination & Workforce Relief — Nurse Care Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Support Coordination">
      <SupportCoordinationPage />
    </AppShell>
  ),
});

const WORKFLOW_STEPS = [
  { step: 1, title: "Pattern Detected", desc: "AI flags persistent elevated strain above baseline." },
  { step: 2, title: "Private Prompt", desc: "Nurse receives a confidential check-in on mobile." },
  { step: 3, title: "Nurse Confirms", desc: "Nurse confirms support need (break, peer relief)." },
  { step: 4, title: "Supervisor Review", desc: "Request appears on supervisor dashboard with context." },
  { step: 5, title: "Select Coverage", desc: "Supervisor selects an available peer or float nurse." },
  { step: 6, title: "Staff Notified", desc: "Dispatched to selected colleague's companion app." },
  { step: 7, title: "Relief Accepted", desc: "Recipient confirms coverage availability." },
  { step: 8, title: "Arrangement Active", desc: "Supervisor confirms assistance plan." },
  { step: 9, title: "Care Delivered", desc: "Peer arrives and covers patient duties." },
  { step: 10, title: "Task Logged", desc: "Completed support is audited in platform history." },
  { step: 11, title: "Feedback", desc: "Optional well-being feedback recorded." },
];

const AVAILABLE_FLOAT_STAFF = [
  { name: "Staff Nurse Kabir", role: "Float RN", ward: "ICU / Emergency", available: true },
  { name: "Staff Nurse Nasreen", role: "Support Nurse", ward: "Surgery", available: true },
  { name: "Staff Nurse Parveen", role: "General Floor Float", ward: "General", available: true },
  { name: "Charge Nurse David", role: "Ward Lead", ward: "Pediatrics", available: false },
];

function SupportCoordinationPage() {
  const { supportRequests, assignSupportRequest, resolveSupportRequest, addNotification } = useStore();
  const nursesQuery = useNurses();
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(
    supportRequests.find((s) => s.status === "pending") ?? supportRequests[0] ?? null
  );
  const [selectedStaff, setSelectedStaff] = useState<string>(AVAILABLE_FLOAT_STAFF[0].name);

  const handleAssign = () => {
    if (!selectedRequest) return;
    assignSupportRequest(selectedRequest.id, selectedStaff);

    addNotification({
      recipients: [selectedStaff],
      category: "break_coverage",
      priority: "urgent",
      subject: `Support Request Coverage: ${selectedRequest.ward} Ward`,
      message: `You have been assigned to cover ${selectedRequest.nurseName} for ${selectedRequest.type.replace("_", " ")} in ${selectedRequest.ward} Ward.`,
      requiresAck: true,
    });

    toast.success(`Assigned ${selectedStaff} to support ${selectedRequest.nurseName}.`, {
      description: "Notification dispatched to companion mobile app.",
    });

    setSelectedRequest({
      ...selectedRequest,
      status: "in_progress",
      assignedTo: selectedStaff,
    });
  };

  const handleResolve = () => {
    if (!selectedRequest) return;
    resolveSupportRequest(selectedRequest.id);
    toast.success(`Support intervention for ${selectedRequest.nurseName} completed and logged to audit trail.`);
    setSelectedRequest({
      ...selectedRequest,
      status: "completed",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#192C28]">Support Coordination & Workforce Relief</h1>
          <p className="text-xs text-[#64766E] mt-0.5">
            Human-led support workflow: coordinate break coverage, task assistance and peer relief without clinical disruption.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#E6EFEA] px-2.5 py-0.5 text-xs font-medium text-[#244D45]">
            11-Step Human Protocol
          </span>
        </div>
      </div>

      {/* Main Grid: Active Requests (Left) & Coordination Panel (Right) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left: Active Requests List (7 Cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-[#E1E6E1] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#192C28]">Active Support Requests</h2>
                <p className="text-xs text-[#64766E]">Incoming relief requests from nurse companion apps</p>
              </div>
              <span className="text-xs text-[#244D45] font-medium">
                {supportRequests.filter((s) => s.status === "pending").length} pending review
              </span>
            </div>

            <div className="divide-y divide-[#E1E6E1]">
              {supportRequests.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                const isPending = req.status === "pending";

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={cn(
                      "p-3.5 cursor-pointer transition-colors flex items-center justify-between gap-3",
                      isSelected ? "bg-[#EFF3F0]" : "hover:bg-[#FAFBF9]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-md text-xs font-semibold shrink-0",
                          isPending ? "bg-[#FFF3DD] text-[#B7791F]" : "bg-[#E6EFEA] text-[#244D45]"
                        )}
                      >
                        <HeartHandshake className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#192C28]">{req.nurseName}</span>
                          <span className="text-[11px] text-[#64766E]">({req.ward} Ward)</span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.2 text-[10px] font-medium uppercase",
                              isPending ? "bg-[#FFF3DD] text-[#B7791F]" : "bg-[#E6EFEA] text-[#244D45]"
                            )}
                          >
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#64766E] mt-0.5">
                          Requested: <strong className="font-medium text-[#192C28] capitalize">{req.type.replace("_", " ")}</strong> • {req.notes}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-[#8A9A92]">{req.requestedAt}</span>
                      {req.assignedTo && (
                        <p className="text-[11px] text-[#244D45] font-medium mt-0.5">Assigned to: {req.assignedTo}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 11-Step Human Protocol Visual Timeline */}
          <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] p-4 shadow-xs">
            <h3 className="text-xs font-semibold text-[#192C28] mb-3 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#244D45]" /> Nurse Care Monitor 11-Step Coordination Lifecycle
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WORKFLOW_STEPS.slice(0, 6).map((s) => (
                <div key={s.step} className="rounded-md border border-[#E1E6E1] bg-[#FAFBF9] p-2 text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#244D45]">
                    <span>Step {s.step}:</span>
                    <span>{s.title}</span>
                  </div>
                  <p className="text-[10px] text-[#64766E] mt-0.5 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Coordination Action Pane (5 Cols) */}
        <div className="space-y-4 lg:col-span-5">
          {selectedRequest ? (
            <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] p-4 shadow-xs">
              <div className="pb-3 border-b border-[#E1E6E1]">
                <span className="text-[11px] font-medium text-[#244D45] uppercase tracking-wider">
                  Dispatch Action
                </span>
                <h3 className="text-sm font-semibold text-[#192C28] mt-0.5">
                  Coordinate Coverage for {selectedRequest.nurseName}
                </h3>
                <p className="text-xs text-[#64766E] mt-0.5">
                  Ward: {selectedRequest.ward} • Need: {selectedRequest.type.replace("_", " ")}
                </p>
              </div>

              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#192C28] mb-1">
                    Select Available Colleague / Float RN:
                  </label>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full h-8 rounded-md border border-[#E1E6E1] bg-white px-2.5 text-xs text-[#192C28] outline-hidden cursor-pointer"
                  >
                    {AVAILABLE_FLOAT_STAFF.map((staff) => (
                      <option key={staff.name} value={staff.name} disabled={!staff.available}>
                        {staff.name} — {staff.role} ({staff.ward}) {staff.available ? "• Ready" : "• Busy"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-md border border-[#E1E6E1] bg-[#FAFBF9] p-3 text-xs">
                  <span className="font-medium text-[#192C28] block mb-1">Assistance Context:</span>
                  <p className="text-[#64766E] leading-relaxed">
                    "{selectedRequest.notes || "Continuous high cognitive load in trauma ward. 15-minute coverage needed."}"
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    onClick={handleAssign}
                    className="w-full h-8 bg-[#244D45] hover:bg-[#1b3d36] text-white text-xs font-medium rounded-md"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                    Assign {selectedStaff.split(" ")[0]} & Dispatch Mobile Notice
                  </Button>

                  {selectedRequest.status === "in_progress" && (
                    <Button
                      onClick={handleResolve}
                      variant="outline"
                      className="w-full h-8 border-[#E1E6E1] text-[#192C28] hover:bg-[#F7F8F5] text-xs font-medium rounded-md"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-[#244D45]" />
                      Mark Support Completed
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] p-8 text-center text-xs text-[#64766E]">
              Select a support request from the list to assign coverage.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
