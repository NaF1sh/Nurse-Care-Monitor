import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore, WARDS, type NotificationItem } from "@/lib/store";
import { useNurses } from "@/lib/queries";
import { fmtTimeSec } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications & Staff Messaging — NurseCare Monitor" },
      { name: "description", content: "Targeted push messaging and acknowledgment tracking for hospital workforce." },
      { property: "og:title", content: "Notifications & Staff Messaging — NurseCare Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Notifications & Messaging">
      <NotificationsPage />
    </AppShell>
  ),
});

function NotificationsPage() {
  const { notifications, addNotification, updateNotificationStatus } = useStore();
  const nursesQuery = useNurses();
  const nurses = nursesQuery.data ?? [];

  // Form state
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [category, setCategory] = useState<NotificationItem["category"]>("check_in");
  const [priority, setPriority] = useState<"normal" | "urgent" | "critical">("normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [requiresAck, setRequiresAck] = useState(true);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const handleSelectNurse = (name: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSelectWard = (ward: string) => {
    const wardNurses = nurses.filter((n) => n.ward === ward).map((n) => n.full_name);
    setSelectedRecipients((prev) => Array.from(new Set([...prev, ...wardNurses])));
    toast.info(`Added all nurses in ${ward} Ward`);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecipients.length === 0) {
      toast.error("Please select at least one recipient.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    addNotification({
      recipients: selectedRecipients,
      category,
      priority,
      subject: subject.trim() || "Supervisor Coordination Message",
      message: message.trim(),
      requiresAck,
    });

    toast.success(`Dispatched to ${selectedRecipients.length} staff member${selectedRecipients.length > 1 ? "s" : ""}!`);
    setMessage("");
    setSubject("");
  };

  const filteredNotifs = notifications.filter((n) => {
    const matchesCat = filterCategory === "all" || n.category === filterCategory;
    const matchesSearch =
      search === "" ||
      n.subject.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase()) ||
      n.recipients.some((r) => r.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Composer & Live Phone Mockup Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Composer (7 Cols) */}
        <Card className="rounded-2xl border-[#E2E7EF] p-6 shadow-2xs bg-white lg:col-span-7">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E7EF]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#E5E9FD] text-[#005859]">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-[#08242d]">
                  Compose Targeted Notification
                </CardTitle>
                <p className="text-xs text-[#64748B]">Dispatches directly to companion Android mobile devices.</p>
              </div>
            </div>
            <span className="rounded-full bg-[#E1F4E9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#16835E]">
              FCM BRIDGE READY
            </span>
          </div>

          <form onSubmit={handleSend} className="mt-5 space-y-4">
            {/* Quick Recipient Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#08242d]">
                  Select Recipients ({selectedRecipients.length})
                </label>
                <div className="flex gap-1 text-[11px] font-bold text-[#005859]">
                  <span className="text-[#8E9FB8]">Ward Quick-Select:</span>
                  {WARDS.slice(0, 3).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleSelectWard(w)}
                      className="hover:underline ml-1"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-12 rounded-xl border border-[#D9E0EB] bg-[#F8FAFC] p-2.5">
                {nurses.map((n) => {
                  const isSelected = selectedRecipients.includes(n.full_name);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleSelectNurse(n.full_name)}
                      className={cn(
                        "rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
                        isSelected
                          ? "bg-[#005859] text-white"
                          : "bg-white border border-[#D9E0EB] text-[#08242d] hover:border-[#005859]"
                      )}
                    >
                      {n.full_name.split(" ")[0]} ({n.ward})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#08242d] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className="w-full h-9 rounded-xl border border-[#D9E0EB] bg-white px-3 text-xs font-semibold text-[#08242d] outline-hidden cursor-pointer"
                >
                  <option value="check_in">Private Check-in Request</option>
                  <option value="assistance">Assistance Request</option>
                  <option value="break_coverage">Break Coverage Coordination</option>
                  <option value="supervisor_msg">Direct Supervisor Message</option>
                  <option value="announcement">General Ward Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#08242d] mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}
                  className="w-full h-9 rounded-xl border border-[#D9E0EB] bg-white px-3 text-xs font-semibold text-[#08242d] outline-hidden cursor-pointer"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="urgent">Urgent Priority (Sound + Haptic)</option>
                  <option value="critical">Critical Attention Needed</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-[#08242d] mb-1">Subject Header</label>
              <Input
                placeholder="e.g. Check-in Request: ICU Ward Support"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-bold text-[#08242d] mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Write your direct instruction or assistance query…"
                className="w-full rounded-xl border border-[#D9E0EB] bg-white p-3 text-xs font-medium text-[#08242d] outline-hidden focus:border-[#005859] focus:ring-1 focus:ring-[#005859]"
              />
            </div>

            {/* Acknowledgment Requirement Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="req-ack"
                checked={requiresAck}
                onChange={(e) => setRequiresAck(e.target.checked)}
                className="rounded border-[#D9E0EB] text-[#005859] focus:ring-[#005859]"
              />
              <label htmlFor="req-ack" className="text-xs font-semibold text-[#08242d] cursor-pointer">
                Require immediate recipient acknowledgment on mobile screen
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-xl bg-[#005859] hover:bg-[#076669] font-extrabold text-xs text-white"
            >
              <Send className="mr-2 h-4 w-4" />
              Dispatch Notification ({selectedRecipients.length} Recipient{selectedRecipients.length === 1 ? "" : "s"})
            </Button>
          </form>
        </Card>

        {/* Live Phone Preview (5 Cols) */}
        <Card className="rounded-2xl border-[#E2E7EF] p-6 shadow-2xs bg-white lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E7EF]">
              <span className="text-xs font-extrabold text-[#08242d] flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[#005859]" /> Mobile Companion Preview
              </span>
              <span className="text-[10px] text-[#8E9FB8]">Android 14 • Wearable Paired</span>
            </div>

            <p className="mt-3 text-xs text-[#64748B]">
              This preview illustrates how the dispatched message renders on a nurse or support staff member's device.
            </p>

            {/* Mobile Device Frame */}
            <div className="mt-4 mx-auto w-full max-w-[300px] rounded-3xl border-4 border-[#08242d] bg-[#F4F6FB] p-3.5 shadow-xl">
              <div className="mx-auto mb-2.5 h-1.5 w-14 rounded-full bg-[#CBD5E1]" />

              {/* Status bar */}
              <div className="flex items-center justify-between px-1 text-[10px] text-[#64748B] mb-2 font-mono">
                <span>09:41</span>
                <span>5G • 85%</span>
              </div>

              {/* Interactive Push Card */}
              <div className="rounded-2xl border border-[#E2E7EF] bg-white p-3.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-[#C9F3DD] text-[10px] font-black text-[#08242d]">
                      W
                    </span>
                    <span className="text-[11px] font-extrabold text-[#08242d]">NurseCare Monitor Hospital</span>
                  </div>
                  <span className="text-[9px] text-[#8E9FB8]">now</span>
                </div>

                <p className="mt-2 text-xs font-extrabold text-[#08242d]">
                  {subject.trim() || (category === "check_in" ? "Supervisor Check-in Request" : "Team Notification")}
                </p>
                <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed break-words">
                  {message.trim() || "Please confirm your availability and status for upcoming ward coverage."}
                </p>

                {requiresAck && (
                  <div className="mt-3 flex gap-1.5 border-t border-[#EEF2F7] pt-2.5">
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-[#005859] py-1 text-[10px] font-bold text-white shadow-xs"
                    >
                      Acknowledge
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-[#E2E7EF] bg-white py-1 text-[10px] font-bold text-[#64748B]"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-[#EEF2F7] p-3 text-[11px] text-[#64748B] text-center">
            Staff acknowledgments synchronize immediately with the supervisor dashboard in real-time.
          </div>
        </Card>
      </div>

      {/* Notification Center & Delivery Status Table */}
      <Card className="rounded-2xl border-[#E2E7EF] shadow-2xs bg-white overflow-hidden">
        <div className="p-5 border-b border-[#E2E7EF] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-extrabold text-[#08242d]">
              Notification Dispatch History & Delivery Tracking
            </CardTitle>
            <p className="text-xs text-[#64748B]">
              Real-time audit log of all messages, delivery verifications and mobile acknowledgments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-8 rounded-lg border border-[#D9E0EB] bg-white px-2.5 text-xs font-semibold text-[#08242d]"
            >
              <option value="all">All Categories</option>
              <option value="check_in">Check-in</option>
              <option value="assistance">Assistance</option>
              <option value="break_coverage">Break Coverage</option>
              <option value="supervisor_msg">Direct Message</option>
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC]">
              <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Time</TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Category</TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Recipients</TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Message Content</TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase text-[#64748B]">Delivery Status</TableHead>
              <TableHead className="text-right text-[11px] font-extrabold uppercase text-[#64748B]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotifs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-xs text-[#64748B]">
                  No notifications match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredNotifs.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-[#64748B]">
                    {fmtTimeSec(n.sentAt)}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-[#EEF2F7] px-2 py-0.5 text-xs font-bold text-[#08242d] capitalize">
                      {n.category.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {n.recipients.map((r) => (
                        <span key={r} className="rounded bg-[#E5E9FD] px-1.5 py-0.5 text-[11px] font-bold text-[#005859]">
                          {r}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-xs font-bold text-[#08242d] truncate">{n.subject}</p>
                    <p className="text-[11px] text-[#64748B] truncate">{n.message}</p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize",
                        n.status === "acknowledged" || n.status === "completed"
                          ? "bg-[#E1F4E9] text-[#16835E]"
                          : "bg-[#FFF0D7] text-[#B7791F]"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          n.status === "acknowledged" ? "bg-[#16835E]" : "bg-[#B7791F]"
                        )}
                      />
                      {n.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {n.status !== "acknowledged" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          updateNotificationStatus(n.id, "acknowledged");
                          toast.success("Marked as acknowledged by recipient!");
                        }}
                        className="h-7 text-[11px] font-bold text-[#16835E] border-[#C9F3DD] hover:bg-[#E1F4E9]"
                      >
                        Simulate Ack
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
