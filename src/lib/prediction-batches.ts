import type { ModelSample, PredictInput, PredictResult } from "./simulation.functions";

export interface SubjectProgress {
  sentThrough: number;
  acknowledgedThrough: number;
  uncertain: boolean;
}

/** Transport bookkeeping only; never changes sensor values or generates predictions. */
export class PredictionBatches {
  private busy = new Set<string>();
  private progress = new Map<string, SubjectProgress>();

  constructor(private storage?: Pick<Storage, "getItem" | "setItem">) {}

  getProgress(subject: string): SubjectProgress {
    const existing = this.progress.get(subject);
    try {
      const stored = JSON.parse(this.storage?.getItem(`gradio-batch-v1:${subject}`) ?? "null");
      if (stored && Number.isFinite(stored.sentThrough) && Number.isFinite(stored.acknowledgedThrough)) {
        const merged = { sentThrough: Math.max(existing?.sentThrough ?? 0, stored.sentThrough), acknowledgedThrough: Math.max(existing?.acknowledgedThrough ?? 0, stored.acknowledgedThrough), uncertain: existing?.uncertain === true || stored.uncertain === true };
        this.progress.set(subject, merged);
        return merged;
      }
    } catch { /* Storage can be unavailable; retain in-memory protection. */ }
    return existing ?? { sentThrough: 0, acknowledgedThrough: 0, uncertain: false };
  }

  private save(subject: string, value: SubjectProgress) {
    this.progress.set(subject, value);
    try { this.storage?.setItem(`gradio-batch-v1:${subject}`, JSON.stringify(value)); } catch { /* In-memory state remains authoritative in this page. */ }
  }

  /** After the Space confirms /reset_subject, its old state is gone: clear the pause, keep timestamps increasing. */
  confirmRemoteReset(subject: string): boolean {
    if (this.busy.has(subject)) return false;
    const p = this.getProgress(subject);
    const through = Math.max(p.sentThrough, p.acknowledgedThrough);
    this.save(subject, { sentThrough: through, acknowledgedThrough: through, uncertain: false });
    return true;
  }

  async send(subject: string, queued: ModelSample[], transport: (input: PredictInput) => Promise<PredictResult>): Promise<PredictResult | null> {
    if (this.busy.has(subject)) return null;
    const progress = this.getProgress(subject);
    if (progress.uncertain) return { ok: false, reason: "api_error", detail: "Previous batch outcome uncertain — requests paused for this subject; remote acknowledgement required (no calibration reset)." };
    let through = Math.max(progress.sentThrough, progress.acknowledgedThrough);
    const samples: ModelSample[] = [];
    for (const sample of queued) {
      const timestamp = Date.parse(sample.timestamp);
      if (Number.isFinite(timestamp) && timestamp > through) { samples.push(sample); through = timestamp; }
    }
    if (!samples.length) return null;
    this.busy.add(subject);
    // Persist uncertainty before dispatch: reload/crash must not replay an unacknowledged batch.
    this.save(subject, { ...progress, sentThrough: through, uncertain: true });
    queued.splice(0, queued.length);
    try {
      const result = await transport({ subject_id: subject, readings: samples });
      const uncertain = !result.ok && (result.reason === "timeout" || result.diagnostic?.outcome_uncertain !== false);
      this.save(subject, { sentThrough: through, acknowledgedThrough: result.ok ? through : progress.acknowledgedThrough, uncertain });
      return result;
    } catch {
      return { ok: false, reason: "api_error", detail: "Request connection failed — batch outcome uncertain; requests paused for this subject (no retry or reset)." };
    } finally {
      this.busy.delete(subject);
    }
  }
}