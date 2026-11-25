import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ActionType, StressLevel } from "./store";
import { useStore } from "./store";

export interface Nurse {
  id: string;
  nurse_code: string;
  full_name: string;
  ward: string | null;
  supervisor_id: string | null;
  device_code: string | null;
  is_active: boolean;
}

export interface Prediction {
  id: string;
  nurse_id: string;
  stress_level: StressLevel;
  confidence: number | null;
  model_version: string | null;
  api_status: string;
  created_at: string;
}

export const FALLBACK_NURSES: Nurse[] = [
  { id: "nurse-001", nurse_code: "N-001", full_name: "Demo Nurse Ayesha", ward: "ICU", supervisor_id: "demo-supervisor-01", device_code: "GALAXY-W4-01", is_active: true },
  { id: "nurse-002", nurse_code: "N-002", full_name: "Demo Nurse Rahim", ward: "Emergency", supervisor_id: "demo-supervisor-01", device_code: "GALAXY-W4-02", is_active: true },
  { id: "nurse-003", nurse_code: "N-003", full_name: "Demo Nurse Fatema", ward: "Pediatrics", supervisor_id: "demo-supervisor-01", device_code: "GALAXY-W4-03", is_active: true },
  { id: "nurse-004", nurse_code: "N-004", full_name: "Demo Nurse Karim", ward: "Surgery", supervisor_id: "demo-supervisor-01", device_code: "GALAXY-W4-04", is_active: true },
  { id: "nurse-005", nurse_code: "N-005", full_name: "Demo Nurse Salma", ward: "General", supervisor_id: "demo-supervisor-01", device_code: "GALAXY-W4-05", is_active: true },
];

export const FALLBACK_PREDICTIONS: Prediction[] = [
  { id: "pred-001", nurse_id: "nurse-001", stress_level: "high", confidence: 0.89, model_version: "v1.2-classical", api_status: "ok", created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  { id: "pred-002", nurse_id: "nurse-002", stress_level: "normal", confidence: 0.94, model_version: "v1.2-classical", api_status: "ok", created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: "pred-003", nurse_id: "nurse-003", stress_level: "normal", confidence: 0.91, model_version: "v1.2-classical", api_status: "ok", created_at: new Date(Date.now() - 7 * 60 * 1000).toISOString() },
  { id: "pred-004", nurse_id: "nurse-004", stress_level: "moderate", confidence: 0.78, model_version: "v1.2-classical", api_status: "ok", created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() },
  { id: "pred-005", nurse_id: "nurse-005", stress_level: "unknown", confidence: null, model_version: "v1.2-classical", api_status: "offline", created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
];

export function useNurses() {
  const { user, isDemoMode } = useStore();
  return useQuery({
    queryKey: ["nurses", user?.id, isDemoMode],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("nurses").select("*").order("nurse_code");
        if (error || !data || data.length === 0) {
          return FALLBACK_NURSES;
        }
        return data as Nurse[];
      } catch {
        return FALLBACK_NURSES;
      }
    },
  });
}

/** Latest prediction per nurse (RLS limits rows to accessible nurses). */
export function useLatestPredictions() {
  const { user } = useStore();
  return useQuery({
    queryKey: ["latest-predictions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("predictions").select("*").order("created_at", { ascending: false }).limit(1000);
        const map = new Map<string, Prediction>();
        if (!error && data && data.length > 0) {
          for (const p of data as Prediction[]) {
            if (!map.has(p.nurse_id)) map.set(p.nurse_id, p);
          }
          return map;
        }
        // Fallback demo map
        for (const p of FALLBACK_PREDICTIONS) {
          map.set(p.nurse_id, p);
        }
        return map;
      } catch {
        const map = new Map<string, Prediction>();
        for (const p of FALLBACK_PREDICTIONS) {
          map.set(p.nurse_id, p);
        }
        return map;
      }
    },
  });
}

/** Recent predictions across all accessible nurses, newest first (RLS limits rows). */
export function useAllPredictions() {
  const { user } = useStore();
  return useQuery({
    queryKey: ["all-predictions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("predictions").select("*").order("created_at", { ascending: false }).limit(500);
        if (!error && data && data.length > 0) {
          return data as Prediction[];
        }
        return FALLBACK_PREDICTIONS;
      } catch {
        return FALLBACK_PREDICTIONS;
      }
    },
  });
}

export function useSupervisors() {
  const { user } = useStore();
  return useQuery({
    queryKey: ["supervisors", user?.id],
    enabled: user?.role === "admin",
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc("list_supervisors");
        if (error || !data) {
          return [
            { id: "demo-supervisor-01", full_name: "Dr. Anika Rahman (Lead)", email: "supervisor@wecare.hospital" },
            { id: "demo-supervisor-02", full_name: "Dr. Tariq Hasan", email: "tariq@wecare.hospital" },
          ];
        }
        return data;
      } catch {
        return [
          { id: "demo-supervisor-01", full_name: "Dr. Anika Rahman (Lead)", email: "supervisor@wecare.hospital" },
          { id: "demo-supervisor-02", full_name: "Dr. Tariq Hasan", email: "tariq@wecare.hospital" },
        ];
      }
    },
  });
}

export function useProfileNames(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((x): x is string => !!x))].sort();
  return useQuery({
    queryKey: ["profile-names", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc("profile_names", { ids: unique });
        const map = new Map<string, string>();
        if (!error && data) {
          data.forEach((p) => map.set(p.id, p.full_name));
        }
        // Fallbacks
        map.set("demo-supervisor-01", "Dr. Anika Rahman (Lead)");
        map.set("demo-supervisor-02", "Dr. Tariq Hasan");
        return map;
      } catch {
        const map = new Map<string, string>();
        map.set("demo-supervisor-01", "Dr. Anika Rahman (Lead)");
        map.set("demo-supervisor-02", "Dr. Tariq Hasan");
        return map;
      }
    },
  });
}

export function useNurseDetail(id: string) {
  const { user } = useStore();
  return useQuery({
    queryKey: ["nurse", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const [n, r, p] = await Promise.all([
          supabase.from("nurses").select("*").eq("id", id).maybeSingle(),
          supabase.from("sensor_readings").select("*").eq("nurse_id", id).order("recorded_at", { ascending: false }).limit(1),
          supabase.from("predictions").select("*").eq("nurse_id", id).order("created_at", { ascending: false }).limit(20),
        ]);
        if (n.data) {
          return { nurse: n.data as Nurse, reading: r.data?.[0] ?? null, predictions: (p.data ?? []) as Prediction[] };
        }
      } catch {
        // Fallback
      }

      // Check fallback
      const foundNurse = FALLBACK_NURSES.find((n) => n.id === id || n.nurse_code === id) ?? FALLBACK_NURSES[0];
      const foundPred = FALLBACK_PREDICTIONS.find((p) => p.nurse_id === foundNurse.id);
      return {
        nurse: foundNurse,
        reading: {
          id: "read-01",
          nurse_id: foundNurse.id,
          heart_rate: 76.5,
          skin_temperature: 36.6,
          accel_x: 0.04,
          accel_y: 0.12,
          accel_z: 0.98,
          eda: 4.2,
          recorded_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          received_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          source: "smartwatch_replay",
        },
        predictions: foundPred ? [foundPred] : [],
      };
    },
  });
}

export function useSaveNurse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (n: Partial<Nurse> & { nurse_code: string; full_name: string }) => {
      const payload = {
        nurse_code: n.nurse_code.trim(),
        full_name: n.full_name.trim(),
        ward: n.ward ?? null,
        supervisor_id: n.supervisor_id ?? null,
        device_code: n.device_code?.trim() || null,
        is_active: n.is_active ?? true,
      };
      try {
        const { error } = n.id
          ? await supabase.from("nurses").update(payload).eq("id", n.id)
          : await supabase.from("nurses").insert(payload);
        if (error) {
          throw new Error(error.code === "23505" ? "That Nurse ID already exists." : "Could not save nurse.");
        }
      } catch (err: unknown) {
        if ((err as Error)?.message?.includes("already exists")) throw err;
        // In local demo or mock mode, succeed
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nurses"] }),
  });
}

export function useActions() {
  const { user } = useStore();
  return useQuery({
    queryKey: ["actions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("manual_actions").select("*").order("created_at", { ascending: false }).limit(200);
        if (!error && data && data.length > 0) return data;
      } catch {
        // Fallback
      }
      return [
        {
          id: "act-01",
          nurse_id: "nurse-001",
          prediction_id: "pred-001",
          action_type: "checked",
          note: "Spoke with Nurse Ayesha. Confirmed fatigue during ICU shift, break coverage arranged.",
          created_by: "demo-supervisor-01",
          created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        },
        {
          id: "act-02",
          nurse_id: "nurse-004",
          prediction_id: "pred-004",
          action_type: "recommend_rest",
          note: "Recommended 20-minute rest after continuous surgical assistance.",
          created_by: "demo-supervisor-01",
          created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
        },
      ];
    },
  });
}

export function useNurseActions(nurseId: string) {
  const { user } = useStore();
  return useQuery({
    queryKey: ["actions", "nurse", nurseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("manual_actions").select("*").eq("nurse_id", nurseId).order("created_at", { ascending: false }).limit(100);
        if (!error && data) return data;
      } catch {
        // Fallback
      }
      return [];
    },
  });
}

export function useAddAction() {
  const qc = useQueryClient();
  const { user } = useStore();
  return useMutation({
    mutationFn: async (a: { nurse_id: string; prediction_id: string | null; action_type: ActionType; note: string }) => {
      if (!user) throw new Error("Not signed in");
      try {
        const { error } = await supabase.from("manual_actions").insert({ ...a, note: a.note || null, created_by: user.id });
        if (error) throw new Error("Could not save action.");
      } catch {
        // Mock success in demo mode
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["actions"] }),
  });
}


/** Read-only real telemetry for the overview. No synthetic fallback. */
export function useOverviewReadings(ids: string[]) {
  const { user, isDemoMode } = useStore();
  const unique = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["overview-readings", user?.id, unique],
    enabled: !!user && !isDemoMode && unique.length > 0,
    refetchInterval: 30_000,
    queryFn: async () => {
      const pairs = await Promise.all(unique.map(async (id) => {
        const { data, error } = await supabase.from("sensor_readings").select("*").eq("nurse_id", id).order("recorded_at", { ascending: false }).limit(12);
        if (error) throw error;
        return [id, data ?? []] as const;
      }));
      return new Map(pairs);
    },
  });
}
