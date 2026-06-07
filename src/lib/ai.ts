import { supabase } from '@/integrations/supabase/client';

export interface GenerateImageResult {
  imageUrl: string;
  description: string;
}

export async function generateImage(prompt: string, style?: string): Promise<GenerateImageResult> {
  // Silent fallback: any error here is caught by the caller, which then
  // transparently switches to the offline engine — never show an error popup.
  try {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: { prompt, style },
    });
    if (error) throw new Error('fallback');
    if (data?.fallback || data?.error) throw new Error('fallback');
    if (!data?.imageUrl) throw new Error('fallback');
    return { imageUrl: data.imageUrl, description: data.description || '' };
  } catch {
    throw new Error('fallback');
  }
}

export interface VeoVideoResult {
  videoUrl: string; // data URL
  mimeType: string;
}

// 🛡️ Rate-limiter: avoid hammering Veo if the user spams the button or
// after repeated failures. Window: 60s, max 3 requests.
const RATE_KEY = 'veo_req_log';
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 3;

function checkRateLimit(): { ok: boolean; retryInMs: number } {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(RATE_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const recent = arr.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX) {
      const oldest = recent[0];
      return { ok: false, retryInMs: RATE_WINDOW_MS - (now - oldest) };
    }
    recent.push(now);
    localStorage.setItem(RATE_KEY, JSON.stringify(recent));
    return { ok: true, retryInMs: 0 };
  } catch {
    return { ok: true, retryInMs: 0 };
  }
}

export class VeoCanceledError extends Error {
  constructor() { super('veo_canceled'); }
}
export class VeoTimeoutError extends Error {
  constructor() { super('veo_timeout'); }
}
export class VeoRateLimitError extends Error {
  retryInMs: number;
  constructor(retryInMs: number) { super('veo_rate_limited'); this.retryInMs = retryInMs; }
}

export interface VeoProgress {
  stage: string;
  state?: string;
  progressPct?: number | null;
  elapsedMs: number;
  etaMs?: number | null;
}

// 🆔 Stable per-device client id (no auth in this app).
const CLIENT_ID_KEY = 'veo_client_id';
export function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = (crypto as any).randomUUID?.() || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

// 📝 Silent event logging — never throws into the calling flow.
export type VeoEventKind = 'start' | 'stage' | 'cancel' | 'timeout' | 'fallback' | 'success' | 'resume' | 'rate_limited' | 'error';
export async function logVeoEvent(kind: VeoEventKind, payload: Record<string, any> = {}, projectId?: string) {
  try {
    await supabase.from('veo_events').insert({
      client_id: getClientId(),
      project_id: projectId || null,
      kind,
      payload,
    });
  } catch {
    // swallow — logging must never break the user flow
  }
}

// 💾 Resume support: persist the in-flight operation for the session
const ACTIVE_OP_KEY = 'veo_active_op';
interface ActiveOp { operationName: string; prompt: string; startedAt: number; totalTimeoutMs: number; projectId?: string; }
function saveActiveOp(op: ActiveOp) { try { sessionStorage.setItem(ACTIVE_OP_KEY, JSON.stringify(op)); } catch {} }
function clearActiveOp() { try { sessionStorage.removeItem(ACTIVE_OP_KEY); } catch {} }
export function getActiveVeoOp(): ActiveOp | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_OP_KEY);
    if (!raw) return null;
    const op = JSON.parse(raw) as ActiveOp;
    if (Date.now() - op.startedAt > op.totalTimeoutMs) { clearActiveOp(); return null; }
    return op;
  } catch { return null; }
}

// 📈 Running average of completed Veo durations — used as ETA fallback
const AVG_KEY = 'veo_avg_duration_ms';
function getAvgDuration(): number {
  try { return Number(localStorage.getItem(AVG_KEY)) || 90_000; } catch { return 90_000; }
}
function updateAvgDuration(sample: number) {
  try {
    const cur = getAvgDuration();
    const next = Math.round(cur * 0.7 + sample * 0.3);
    localStorage.setItem(AVG_KEY, String(next));
  } catch {}
}

/**
 * Generate a real cinematic video via Google AI Studio (Veo).
 * Supports: total timeout, abort signal, dynamic stage callbacks, rate-limiting.
 */
export async function generateVeoVideo(
  prompt: string,
  opts?: {
    aspectRatio?: '16:9' | '9:16';
    durationSec?: number;
    totalTimeoutMs?: number;       // hard cap on entire op (default 180s)
    pollIntervalMs?: number;        // polling cadence (default 5s)
    signal?: AbortSignal;           // cancel from UI
    onProgress?: (p: VeoProgress) => void;
    skipRateLimit?: boolean;
    projectId?: string;
    resumeOperationName?: string;   // resume a saved op instead of starting a new one
  }
): Promise<VeoVideoResult> {
  // Local guard first — server-side enforced inside veo-start.
  if (!opts?.skipRateLimit && !opts?.resumeOperationName) {
    const rl = checkRateLimit();
    if (!rl.ok) throw new VeoRateLimitError(rl.retryInMs);
  }

  const totalTimeoutMs = opts?.totalTimeoutMs ?? 180_000;
  const pollIntervalMs = opts?.pollIntervalMs ?? 5_000;
  const signal = opts?.signal;
  const t0 = Date.now();
  const samples: { t: number; pct: number }[] = [];

  const throwIfDone = () => {
    if (signal?.aborted) throw new VeoCanceledError();
    if (Date.now() - t0 > totalTimeoutMs) throw new VeoTimeoutError();
  };

  // 1) Start or resume operation
  let operationName: string;
  if (opts?.resumeOperationName) {
    operationName = opts.resumeOperationName;
    opts?.onProgress?.({ stage: 'استئناف عملية Veo…', elapsedMs: 0 });
    logVeoEvent('resume', { operationName }, opts?.projectId);
  } else {
    opts?.onProgress?.({ stage: 'إرسال الطلب إلى Veo…', elapsedMs: 0 });
    throwIfDone();
    const startRes = await supabase.functions.invoke('veo-start', {
      body: {
        prompt,
        aspectRatio: opts?.aspectRatio || '16:9',
        durationSec: opts?.durationSec || 8,
        clientId: getClientId(),
      },
    });
    throwIfDone();
    const sd = startRes.data || {};
    if (sd.error === 'rate_limited') {
      logVeoEvent('rate_limited', { source: 'server', retryInMs: sd.retryInMs }, opts?.projectId);
      throw new VeoRateLimitError(sd.retryInMs || 30_000);
    }
    if (startRes.error || sd.error || !sd.operationName) {
      logVeoEvent('error', { phase: 'start', detail: sd.error || 'invoke_failed' }, opts?.projectId);
      throw new Error('veo_start_failed');
    }
    operationName = sd.operationName;
    saveActiveOp({ operationName, prompt, startedAt: t0, totalTimeoutMs, projectId: opts?.projectId });
    logVeoEvent('start', { operationName, aspectRatio: opts?.aspectRatio, durationSec: opts?.durationSec }, opts?.projectId);
  }

  // 2) Poll loop with abort + dynamic stage
  while (true) {
    throwIfDone();
    // Wait between polls but stay responsive to abort
    await new Promise<void>((resolve, reject) => {
      const id = setTimeout(resolve, pollIntervalMs);
      const onAbort = () => { clearTimeout(id); reject(new VeoCanceledError()); };
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
    });
    throwIfDone();

    // 🌐 If offline, wait for connectivity instead of failing.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      opts?.onProgress?.({ stage: 'بانتظار عودة الشبكة…', elapsedMs: Date.now() - t0 });
      await new Promise<void>((resolve, reject) => {
        const onOnline = () => { window.removeEventListener('online', onOnline); resolve(); };
        const onAbort = () => { window.removeEventListener('online', onOnline); reject(new VeoCanceledError()); };
        window.addEventListener('online', onOnline, { once: true });
        if (signal) signal.addEventListener('abort', onAbort, { once: true });
      });
      continue;
    }

    let pollData: any = null;
    try {
      const poll = await supabase.functions.invoke('veo-poll', { body: { operationName } });
      pollData = poll.data;
      if (poll.error) throw poll.error;
    } catch {
      // Transient network/edge error → keep polling silently
      opts?.onProgress?.({ stage: 'إعادة الاتصال بـ Veo…', elapsedMs: Date.now() - t0 });
      continue;
    }
    throwIfDone();
    const d = pollData || {};
    const elapsedMs = Date.now() - t0;
    const pct = typeof d.progressPct === 'number' ? d.progressPct : null;
    let etaMs: number | null = null;
    if (pct !== null) {
      samples.push({ t: elapsedMs, pct });
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dPct = last.pct - first.pct;
        const dT = last.t - first.t;
        if (dPct > 0 && dT > 0) etaMs = Math.max(0, ((100 - last.pct) / dPct) * dT);
      }
    }
    if (etaMs === null) {
      const avg = getAvgDuration();
      etaMs = Math.max(0, avg - elapsedMs);
    }
    if (d.stage) logVeoEvent('stage', { stage: d.stage, state: d.state, pct, etaMs }, opts?.projectId);
    opts?.onProgress?.({
      stage: d.stage || 'جاري المعالجة…',
      state: d.state,
      progressPct: pct,
      elapsedMs,
      etaMs,
    });
    if (d.done) {
      clearActiveOp();
      if (d.error || !d.videoUrl) {
        logVeoEvent('error', { phase: 'poll_done', detail: d.error || 'no_video' }, opts?.projectId);
        throw new Error('veo_no_video');
      }
      updateAvgDuration(elapsedMs);
      logVeoEvent('success', { elapsedMs }, opts?.projectId);
      return { videoUrl: d.videoUrl, mimeType: d.mimeType || 'video/mp4' };
    }
  }
}
