import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Database,
  Globe,
  Key,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { LanguageToggle } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Workspace & System Settings — Nurse Care Monitor" },
      { name: "description", content: "Supervisor preferences, privacy settings, demonstration controls and hospital configuration." },
      { property: "og:title", content: "Workspace & System Settings — Nurse Care Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="System Settings">
      <SettingsPage />
    </AppShell>
  ),
});

function SettingsPage() {
  const { user, isDemoMode, enterDemoMode, exitDemoMode } = useStore();
  const [fcmEnabled, setFcmEnabled] = useState(true);
  const [hapticAlerts, setHapticAlerts] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Preferences updated successfully!");
  };

  const handleResetDemo = () => {
    enterDemoMode();
    toast.success("Demo environment reset to standard competition showcase state!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-[#172033] tracking-tight">Workspace & System Settings</h2>
        <p className="text-xs text-[#64748B]">
          Supervisor identity, companion notification bridge, privacy retention and demonstration controls.
        </p>
      </div>

      {/* Demonstration Controls Card */}
      <Card className="rounded-2xl border border-[#C9F3DD] bg-[#E1F4E9]/30 p-6 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#C9F3DD] text-[#142039] shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#142039]">Competition Demonstration Mode</h3>
              <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                Pre-configured for the International AI Builders Congress evaluation. Enables seamless walkthrough of the 11-step support workflow, simulated wearable streams and instant companion notification previews without altering production records.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleResetDemo}
              className="h-8 rounded-xl bg-[#16835E] hover:bg-[#136c4d] text-xs font-bold text-white shadow-xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Demo Session
            </Button>
          </div>
        </div>
      </Card>

      {/* Supervisor Account Profile */}
      <Card className="rounded-2xl border-[#E2E7EF] p-6 shadow-2xs bg-white">
        <div className="flex items-center gap-2 pb-4 border-b border-[#E2E7EF]">
          <User className="h-4 w-4 text-[#394BC5]" />
          <CardTitle className="text-base font-extrabold text-[#172033]">Supervisor Profile</CardTitle>
        </div>

        <form onSubmit={handleSavePreferences} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#172033] mb-1">Full Name</label>
              <Input
                defaultValue={user?.full_name || "Dr. Anika Rahman"}
                disabled={isDemoMode}
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#172033] mb-1">Email Address</label>
              <Input
                defaultValue={user?.email || "supervisor@wecare.hospital"}
                disabled
                className="h-9 text-xs rounded-xl bg-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#172033] mb-1">Assigned Role</label>
              <Input
                defaultValue={user?.role === "admin" ? "Lead Supervisor (Admin)" : "Unit Supervisor"}
                disabled
                className="h-9 text-xs rounded-xl bg-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#172033] mb-1">Hospital Organization</label>
              <Input
                defaultValue="City General Hospital (Central Inpatient Wing)"
                disabled
                className="h-9 text-xs rounded-xl bg-[#F8FAFC]"
              />
            </div>
          </div>

          <Button type="submit" className="h-9 rounded-xl bg-[#394BC5] hover:bg-[#303eaa] text-xs font-bold text-white">
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes
          </Button>
        </form>
      </Card>

      {/* Notification & Companion Preferences */}
      <Card className="rounded-2xl border-[#E2E7EF] p-6 shadow-2xs bg-white">
        <div className="flex items-center gap-2 pb-4 border-b border-[#E2E7EF]">
          <Bell className="h-4 w-4 text-[#394BC5]" />
          <CardTitle className="text-base font-extrabold text-[#172033]">
            Companion App & Push Notification Bridge
          </CardTitle>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#EEF2F7]">
            <div>
              <p className="text-xs font-bold text-[#172033]">Firebase Cloud Messaging (FCM) Dispatch</p>
              <p className="text-[11px] text-[#64748B]">Push notifications directly to staff Android companion devices</p>
            </div>
            <input
              type="checkbox"
              checked={fcmEnabled}
              onChange={(e) => setFcmEnabled(e.target.checked)}
              className="rounded border-[#D9E0EB] text-[#394BC5]"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#EEF2F7]">
            <div>
              <p className="text-xs font-bold text-[#172033]">High-Priority Haptic Vibration</p>
              <p className="text-[11px] text-[#64748B]">Trigger wearable wrist vibration on urgent relief requests</p>
            </div>
            <input
              type="checkbox"
              checked={hapticAlerts}
              onChange={(e) => setHapticAlerts(e.target.checked)}
              className="rounded border-[#D9E0EB] text-[#394BC5]"
            />
          </div>
        </div>
      </Card>

      {/* Privacy & Governance Policy */}
      <Card className="rounded-2xl border-[#E2E7EF] p-6 shadow-2xs bg-white">
        <div className="flex items-center gap-2 pb-4 border-b border-[#E2E7EF]">
          <ShieldCheck className="h-4 w-4 text-[#16835E]" />
          <CardTitle className="text-base font-extrabold text-[#172033]">
            Privacy, Consent & Data Governance
          </CardTitle>
        </div>

        <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#64748B]">
          <p>
            • <strong>Voluntary Participation:</strong> Physiological sensor monitoring requires explicit written consent from nursing staff. Nurses may pause or revoke participation at any time without punitive consequences.
          </p>
          <p>
            • <strong>Non-Diagnostic Designation:</strong> Nurse Care Monitor is a supportive workforce coordination aid, not a diagnostic medical device. It does not determine clinical competence or clinical staffing ratios automatically.
          </p>
          <p>
            • <strong>Rolling Retention:</strong> High-frequency physiological signals are retained for {retentionDays} days before automatic purge, in compliance with healthcare data protection standards.
          </p>
        </div>
      </Card>
    </div>
  );
}
