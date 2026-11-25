import type React from "react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "supervisor";
export type StressLevel = "normal" | "moderate" | "high" | "unknown";
export type ActionType = "checked" | "recommend_rest" | "follow_up" | "other";

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  isDemo?: boolean;
}

export interface NotificationItem {
  id: string;
  recipients: string[]; // nurse codes or staff names
  category: "check_in" | "assistance" | "break_coverage" | "announcement" | "supervisor_msg";
  priority: "normal" | "urgent" | "critical";
  subject: string;
  message: string;
  sentAt: string;
  status: "queued" | "sent" | "received" | "read" | "acknowledged" | "accepted" | "declined" | "completed";
  requiresAck: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface SupportRequest {
  id: string;
  nurseCode: string;
  nurseName: string;
  ward: string;
  type: "short_break" | "peer_assistance" | "routine_task" | "temporary_coverage" | "supervisor_talk";
  status: "pending" | "assigned" | "in_progress" | "completed" | "unresolved";
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
  stressLevel?: StressLevel;
  notes?: string;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  isDemoMode: boolean;
  activeWard: string;
  setActiveWard: (ward: string) => void;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  logout: () => Promise<void>;
  notifications: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, "id" | "sentAt" | "status">) => NotificationItem;
  updateNotificationStatus: (id: string, status: NotificationItem["status"]) => void;
  supportRequests: SupportRequest[];
  assignSupportRequest: (requestId: string, staffName: string) => void;
  resolveSupportRequest: (requestId: string) => void;
}

export const DEMO_USER: AppUser = {
  id: "demo-supervisor-01",
  email: "supervisor@wecare.hospital",
  full_name: "Dr. Anika Rahman (Lead Supervisor)",
  role: "admin",
  isDemo: true,
};

const INITIAL_SUPPORT_REQUESTS: SupportRequest[] = [
  {
    id: "SR-101",
    nurseCode: "N-001",
    nurseName: "Demo Nurse Ayesha",
    ward: "ICU",
    type: "short_break",
    status: "pending",
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    stressLevel: "high",
    notes: "High sustained heart rate above baseline for 20 mins during ICU emergency intake.",
  },
  {
    id: "SR-102",
    nurseCode: "N-004",
    nurseName: "Demo Nurse Karim",
    ward: "Surgery",
    type: "peer_assistance",
    status: "in_progress",
    assignedTo: "Staff Nurse Kabir",
    createdAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    stressLevel: "moderate",
    notes: "Post-op medication round assistance requested.",
  },
  {
    id: "SR-103",
    nurseCode: "N-002",
    nurseName: "Demo Nurse Rahim",
    ward: "Emergency",
    type: "temporary_coverage",
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    stressLevel: "high",
    notes: "Triage overload; requested 15-minute coverage.",
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "NOTIF-01",
    recipients: ["Demo Nurse Ayesha"],
    category: "check_in",
    priority: "urgent",
    subject: "Private Check-in Request",
    message: "We noticed elevated physiological strain in ICU. Please let us know if you need assistance or a quick break.",
    sentAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    status: "acknowledged",
    requiresAck: true,
    acknowledgedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    acknowledgedBy: "Demo Nurse Ayesha",
  },
  {
    id: "NOTIF-02",
    recipients: ["Emergency Ward"],
    category: "break_coverage",
    priority: "normal",
    subject: "Break Coverage Coordination",
    message: "Assistance has been requested in Emergency Ward triage. Available support nurses please acknowledge.",
    sentAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    status: "sent",
    requiresAck: true,
  },
];

// Keep one context object across hot reloads so the provider and hooks always match.
const g = globalThis as unknown as { __nsmAuthCtx?: React.Context<AuthState | null> };
const Ctx = (g.__nsmAuthCtx ??= createContext<AuthState | null>(null));

async function loadUser(id: string, email: string): Promise<AppUser> {
  try {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
    ]);
    const role: Role = roles?.some((r) => r.role === "admin") ? "admin" : "supervisor";
    return { id, email, full_name: profile?.full_name ?? email, role, isDemo: false };
  } catch {
    return { id, email, full_name: email, role: "supervisor", isDemo: false };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeWard, setActiveWard] = useState<string>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>(INITIAL_SUPPORT_REQUESTS);

  useEffect(() => {
    // Default to demo user so the dashboard and left sidebar are immediately visible and functional
    const apply = async (session: { user: { id: string; email?: string } } | null) => {
      if (!session) {
        setUser(DEMO_USER);
        setIsDemoMode(true);
        setLoading(false);
        return;
      }
      setUser(await loadUser(session.user.id, session.user.email ?? ""));
      setIsDemoMode(false);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setTimeout(() => {
        void apply(session);
        if (event !== "SIGNED_OUT") void qc.invalidateQueries();
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const enterDemoMode = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("wecare-demo-mode", "true");
    }
    setUser(DEMO_USER);
    setIsDemoMode(true);
    setLoading(false);
  };

  const exitDemoMode = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wecare-demo-mode");
    }
    setUser(null);
    setIsDemoMode(false);
  };

  const logout = async () => {
    await qc.cancelQueries();
    qc.clear();
    exitDemoMode();
    await supabase.auth.signOut();
    setUser(null);
  };

  const addNotification = (item: Omit<NotificationItem, "id" | "sentAt" | "status">) => {
    const newItem: NotificationItem = {
      ...item,
      id: `NOTIF-${Date.now().toString().slice(-4)}`,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    setNotifications((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateNotificationStatus = (id: string, status: NotificationItem["status"]) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              status,
              ...(status === "acknowledged" ? { acknowledgedAt: new Date().toISOString() } : {}),
            }
          : n
      )
    );
  };

  const assignSupportRequest = (requestId: string, staffName: string) => {
    setSupportRequests((prev) =>
      prev.map((sr) =>
        sr.id === requestId
          ? { ...sr, status: "in_progress", assignedTo: staffName }
          : sr
      )
    );
  };

  const resolveSupportRequest = (requestId: string) => {
    setSupportRequests((prev) =>
      prev.map((sr) =>
        sr.id === requestId
          ? { ...sr, status: "completed", completedAt: new Date().toISOString() }
          : sr
      )
    );
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        isDemoMode,
        activeWard,
        setActiveWard,
        enterDemoMode,
        exitDemoMode,
        logout,
        notifications,
        addNotification,
        updateNotificationStatus,
        supportRequests,
        assignSupportRequest,
        resolveSupportRequest,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

export const STALE_MINUTES = 30;
export const WARDS = ["ICU", "Emergency", "Pediatrics", "Surgery", "General"];
export const ACTION_LABELS: Record<ActionType, string> = {
  checked: "Checked nurse",
  recommend_rest: "Recommend rest",
  follow_up: "Follow-up",
  other: "Other action",
};

export const isStale = (iso?: string | null) =>
  !iso || Date.now() - new Date(iso).getTime() > STALE_MINUTES * 60_000;

export const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";

export const fmtTimeSec = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "medium" }) : "—";
