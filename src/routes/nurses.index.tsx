import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, StressBadge } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLatestPredictions, useNurses, useProfileNames, useSaveNurse, useSupervisors, type Nurse } from "@/lib/queries";
import { isStale, useStore, WARDS } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nurses/")({
  head: () => ({
    meta: [
      { title: "Nurse Roster & Workforce Management — WeCare" },
      { name: "description", content: "Manage nurses, clinical ward assignments, supervisors and wearable pairing." },
      { property: "og:title", content: "Nurse Roster & Workforce Management — WeCare" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Nurse Management">
      <Nurses />
    </AppShell>
  ),
});

type Draft = Omit<Nurse, "id"> & { id?: string };
const empty: Draft = { nurse_code: "", full_name: "", ward: "ICU", supervisor_id: null, device_code: "", is_active: true };

function Nurses() {
  const { user } = useStore();
  const t = useT();
  const isAdmin = user?.role === "admin" || user?.isDemo;
  const nurses = useNurses();
  const preds = useLatestPredictions();
  const save = useSaveNurse();
  const names = useProfileNames((nurses.data ?? []).map((n) => n.supervisor_id));
  const [q, setQ] = useState("");
  const [ward, setWard] = useState("all");
  const [editing, setEditing] = useState<Draft | null>(null);

  const list = (nurses.data ?? []).filter(
    (n) =>
      (ward === "all" || n.ward === ward) &&
      (n.full_name + n.nurse_code).toLowerCase().includes(q.toLowerCase())
  );

  const toggle = (n: Nurse) =>
    save.mutate(
      { ...n, is_active: !n.is_active },
      {
        onSuccess: () => toast.success(n.is_active ? t("nurses.deactivated") || "Nurse deactivated" : t("nurses.activated") || "Nurse activated"),
        onError: (e) => toast.error(e.message),
      }
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#192C28]">Nurse Roster & Clinical Ward Assignments</h1>
          <p className="text-xs text-[#64766E] mt-0.5">
            Manage nurse profiles, assigned clinical wards, supervisor oversight and wearable device pairing.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setEditing({ ...empty })}
            className="h-7 rounded-md bg-[#244D45] hover:bg-[#1b3d36] text-xs font-medium text-white shadow-xs"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add Nurse
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-[#E1E6E1] bg-[#FFFFFF] shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-[#FAFBF9] border-b border-[#E1E6E1]">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#64766E]" />
            <Input
              className="h-7 pl-7 text-xs bg-white rounded-md border-[#E1E6E1] focus-visible:ring-1 focus-visible:ring-[#244D45]"
              placeholder={t("nurses.search") || "Filter by name or ID…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            value={ward}
            onChange={(e) => setWard(e.target.value)}
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

        {/* Attio-style Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E1E6E1] bg-[#FAFBF9] text-[#64766E] font-medium">
                <th className="py-2.5 px-3.5 font-medium">ID</th>
                <th className="py-2.5 px-3 font-medium">Nurse Name</th>
                <th className="py-2.5 px-3 font-medium">Ward</th>
                <th className="py-2.5 px-3 font-medium">Supervisor</th>
                <th className="py-2.5 px-3 font-medium">Wearable Device</th>
                <th className="py-2.5 px-3 font-medium">Current Status</th>
                {isAdmin && <th className="py-2.5 px-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E6E1]">
              {nurses.isLoading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#64766E]">
                    {t("common.loading") || "Loading nurses…"}
                  </td>
                </tr>
              )}
              {!nurses.isLoading && list.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#64766E]">
                    {t("nurses.empty") || "No nurses found."}
                  </td>
                </tr>
              )}
              {list.map((n) => {
                const p = preds.data?.get(n.id) || preds.data?.get(n.nurse_code);
                return (
                  <tr key={n.id} className={cn("transition-colors", n.is_active ? "hover:bg-[#FAFBF9]" : "opacity-60 bg-[#FAFBF9]")}>
                    <td className="py-3 px-3.5 font-mono text-xs text-[#64766E]">{n.nurse_code}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-[#EFF3F0] text-[11px] font-semibold text-[#244D45]">
                          {n.full_name.split(" ").slice(-2).map((x) => x[0]).join("")}
                        </div>
                        <Link to="/nurses/$id" params={{ id: n.id }} className="text-xs font-medium text-[#192C28] hover:text-[#244D45] hover:underline">
                          {n.full_name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-[#192C28]">
                        {n.ward ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#64766E]">
                      {n.supervisor_id ? names.data?.get(n.supervisor_id) ?? "Lead Supervisor" : t("nurses.unassigned") || "Unassigned"}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-[#192C28]">{n.device_code || "Galaxy Watch4"}</td>
                    <td className="py-3 px-3">
                      {n.is_active ? (
                        <StressBadge level={p?.stress_level} stale={!!p && isStale(p.created_at)} />
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[#EFF3F0] px-2 py-0.5 text-xs font-medium text-[#64766E]">
                          {t("nurses.inactive") || "Inactive"}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditing(n)}
                            className="rounded px-2 py-1 text-[11px] font-medium text-[#244D45] hover:bg-[#EFF3F0] transition-colors"
                          >
                            {t("nurses.edit") || "Edit"}
                          </button>
                          <button
                            onClick={() => toggle(n)}
                            className="rounded px-2 py-1 text-[11px] font-medium text-[#64766E] hover:text-[#C24152] hover:bg-[#EFF3F0] transition-colors"
                          >
                            {n.is_active ? t("nurses.deactivate") || "Deactivate" : t("nurses.activate") || "Activate"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E1E6E1] px-4 py-2 text-xs text-[#64766E] bg-[#FAFBF9]">
          Showing {list.length} nurse{list.length === 1 ? "" : "s"}
        </div>
      </div>

      {editing && <NurseDialog nurse={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function NurseDialog({ nurse, onClose }: { nurse: Draft; onClose: () => void }) {
  const t = useT();
  const [f, setF] = useState(nurse);
  const sups = useSupervisors();
  const save = useSaveNurse();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF({ ...f, [k]: v });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-lg sm:max-w-md bg-white border border-[#E1E6E1] p-5">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-[#192C28]">
            {nurse.id ? t("nurses.dialog.editTitle") || "Edit Nurse Profile" : t("nurses.dialog.addTitle") || "Add New Nurse"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(f, {
              onSuccess: () => {
                toast.success(t("nurses.saved") || "Nurse profile saved!");
                onClose();
              },
              onError: (err) => toast.error(err.message),
            });
          }}
        >
          <div className="grid gap-1">
            <Label className="text-xs font-medium text-[#192C28]">Nurse Code / ID</Label>
            <Input required maxLength={50} value={f.nurse_code} onChange={(e) => set("nurse_code", e.target.value)} className="h-8 text-xs rounded-md border-[#E1E6E1]" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs font-medium text-[#192C28]">Full Name</Label>
            <Input required maxLength={120} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} className="h-8 text-xs rounded-md border-[#E1E6E1]" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs font-medium text-[#192C28]">Assigned Clinical Ward</Label>
            <select
              value={f.ward ?? "ICU"}
              onChange={(e) => set("ward", e.target.value)}
              className="h-8 rounded-md border border-[#E1E6E1] bg-white px-2.5 text-xs text-[#192C28]"
            >
              {WARDS.map((w) => (
                <option key={w} value={w}>
                  {w} Ward
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs font-medium text-[#192C28]">Supervisor Oversight</Label>
            <select
              value={f.supervisor_id ?? "none"}
              onChange={(e) => set("supervisor_id", e.target.value === "none" ? null : e.target.value)}
              className="h-8 rounded-md border border-[#E1E6E1] bg-white px-2.5 text-xs text-[#192C28]"
            >
              <option value="none">Unassigned</option>
              {(sups.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.email})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs font-medium text-[#192C28]">Paired Smartwatch Code</Label>
            <Input maxLength={50} placeholder="e.g. GALAXY-W4-01" value={f.device_code ?? ""} onChange={(e) => set("device_code", e.target.value)} className="h-8 text-xs rounded-md border-[#E1E6E1]" />
          </div>
          <DialogFooter className="mt-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-7 text-xs border-[#E1E6E1]">
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending} className="h-7 text-xs font-medium bg-[#244D45] hover:bg-[#1b3d36] text-white">
              Save Profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
