import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Filter,
  Mail,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNurses } from "@/lib/queries";
import { useStore, WARDS } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Directory & Hospital Workforce — Nurse Care Monitor" },
      { name: "description", content: "Unified hospital personnel directory for nurses, supervisors, and clinical support staff." },
      { property: "og:title", content: "Staff Directory & Hospital Workforce — Nurse Care Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Staff Directory">
      <StaffPage />
    </AppShell>
  ),
});

interface StaffMember {
  id: string;
  code: string;
  name: string;
  role: "Nurse" | "Supervisor" | "Float Relief" | "Charge Nurse";
  ward: string;
  shift: string;
  available: boolean;
  appStatus: "paired" | "active" | "invited";
  phone: string;
}

const EXTENDED_STAFF: StaffMember[] = [
  { id: "S-01", code: "N-001", name: "Demo Nurse Ayesha", role: "Nurse", ward: "ICU", shift: "Morning (07:00-15:30)", available: true, appStatus: "paired", phone: "+880 1711-000001" },
  { id: "S-02", code: "N-002", name: "Demo Nurse Rahim", role: "Nurse", ward: "Emergency", shift: "Morning (07:00-15:30)", available: true, appStatus: "paired", phone: "+880 1711-000002" },
  { id: "S-03", code: "N-003", name: "Demo Nurse Fatema", role: "Nurse", ward: "Pediatrics", shift: "Day (08:00-16:30)", available: true, appStatus: "paired", phone: "+880 1711-000003" },
  { id: "S-04", code: "N-004", name: "Demo Nurse Karim", role: "Nurse", ward: "Surgery", shift: "Morning (07:00-15:30)", available: true, appStatus: "paired", phone: "+880 1711-000004" },
  { id: "S-05", code: "N-005", name: "Demo Nurse Salma", role: "Nurse", ward: "General", shift: "Night (23:00-07:30)", available: false, appStatus: "active", phone: "+880 1711-000005" },
  { id: "S-06", code: "SUP-01", name: "Dr. Anika Rahman", role: "Supervisor", ward: "All Inpatient", shift: "Rotating Shift", available: true, appStatus: "paired", phone: "+880 1812-990001" },
  { id: "S-07", code: "SUP-02", name: "Dr. Tariq Hasan", role: "Supervisor", ward: "Emergency", shift: "Evening Shift", available: true, appStatus: "paired", phone: "+880 1812-990002" },
  { id: "S-08", code: "FLT-01", name: "Staff Nurse Kabir", role: "Float Relief", ward: "Central Wing", shift: "On-Call Relief", available: true, appStatus: "active", phone: "+880 1913-440001" },
  { id: "S-09", code: "FLT-02", name: "Staff Nurse Nasreen", role: "Float Relief", ward: "Surgery & ICU", shift: "On-Call Relief", available: true, appStatus: "active", phone: "+880 1913-440002" },
];

function StaffPage() {
  const { addNotification } = useStore();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());

  const filtered = EXTENDED_STAFF.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    const matchesWard = wardFilter === "all" || s.ward.includes(wardFilter);
    return matchesSearch && matchesRole && matchesWard;
  });

  const toggleSelect = (name: string) => {
    setSelectedStaff((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleNotifySelected = () => {
    if (selectedStaff.size === 0) {
      toast.error("Please select staff members first.");
      return;
    }
    const recipients = Array.from(selectedStaff);
    addNotification({
      recipients,
      category: "supervisor_msg",
      priority: "normal",
      subject: "Workforce Coordination Message",
      message: "Direct message from clinical supervisor regarding shift support and patient care.",
      requiresAck: true,
    });
    toast.success(`Dispatched notifications to ${recipients.length} staff members.`);
    setSelectedStaff(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#192C28]">Hospital Staff & Workforce Directory</h1>
          <p className="text-xs text-[#64766E] mt-0.5">
            Directory of active nurses, clinical supervisors, and float personnel connected to Nurse Care Monitor.
          </p>
        </div>

        {selectedStaff.size > 0 && (
          <Button
            onClick={handleNotifySelected}
            className="h-7 rounded-md bg-[#244D45] hover:bg-[#1b3d36] text-xs font-medium text-white shadow-xs"
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Notify Selected ({selectedStaff.size})
          </Button>
        )}
      </div>

      {/* Directory Table */}
      <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-[#FAFBF9] border-b border-[#E1E6E1]">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#64766E]" />
            <Input
              className="h-7 pl-7 text-xs bg-white rounded-md border-[#E1E6E1] focus-visible:ring-1 focus-visible:ring-[#244D45]"
              placeholder="Search by name, ID or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-7 rounded-md border border-[#E1E6E1] bg-white px-2 text-xs font-medium text-[#192C28] cursor-pointer outline-hidden"
          >
            <option value="all">All Roles</option>
            <option value="Nurse">Staff Nurses</option>
            <option value="Supervisor">Supervisors</option>
            <option value="Float Relief">Float Relief</option>
          </select>

          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="h-7 rounded-md border border-[#E1E6E1] bg-white px-2 text-xs font-medium text-[#192C28] cursor-pointer outline-hidden"
          >
            <option value="all">All Wards</option>
            {WARDS.map((w) => (
              <option key={w} value={w}>
                {w} Ward
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E1E6E1] bg-[#FAFBF9] text-[#64766E] font-medium">
                <th className="py-2.5 px-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={selectedStaff.size === filtered.length && filtered.length > 0}
                    onChange={() => {
                      if (selectedStaff.size === filtered.length) setSelectedStaff(new Set());
                      else setSelectedStaff(new Set(filtered.map((s) => s.name)));
                    }}
                    className="rounded border-[#D9DFD9] text-[#244D45] focus:ring-[#244D45]"
                  />
                </th>
                <th className="py-2.5 px-3 font-medium">Code</th>
                <th className="py-2.5 px-3 font-medium">Personnel</th>
                <th className="py-2.5 px-3 font-medium">Role</th>
                <th className="py-2.5 px-3 font-medium">Ward Assignment</th>
                <th className="py-2.5 px-3 font-medium">Shift</th>
                <th className="py-2.5 px-3 font-medium">App Pairing</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E6E1]">
              {filtered.map((s) => {
                const isSelected = selectedStaff.has(s.name);

                return (
                  <tr
                    key={s.id}
                    className={cn("transition-colors", isSelected ? "bg-[#EFF3F0]" : "hover:bg-[#FAFBF9]")}
                  >
                    <td className="py-3 px-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.name)}
                        className="rounded border-[#D9DFD9] text-[#244D45] focus:ring-[#244D45]"
                      />
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-[#64766E]">{s.code}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-[#EFF3F0] text-[10px] font-semibold text-[#244D45]">
                          {s.name[0]}
                        </div>
                        <span className="font-medium text-[#192C28]">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[#192C28]">{s.role}</span>
                    </td>
                    <td className="py-3 px-3 text-[#192C28] font-medium">{s.ward}</td>
                    <td className="py-3 px-3 text-[#64766E]">{s.shift}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 rounded bg-[#E6EFEA] px-2 py-0.5 text-[11px] font-medium text-[#244D45]">
                        <Smartphone className="h-3 w-3" /> Paired
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedStaff(new Set([s.name]));
                          handleNotifySelected();
                        }}
                        className="rounded px-2 py-1 text-[11px] font-medium text-[#244D45] hover:bg-[#EFF3F0] transition-colors"
                      >
                        Message
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#E1E6E1] px-4 py-2 text-xs text-[#64766E] bg-[#FAFBF9]">
          Showing {filtered.length} staff members
        </div>
      </div>
    </div>
  );
}
