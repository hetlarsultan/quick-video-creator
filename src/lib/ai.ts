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

function checkRateLimit(): { ok: true } | { ok: false; retryInMs: number } {
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
    return { ok: true };
  } catch {
    return { ok: true };
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
  }
): Promise<VeoVideoResult> {
  if (!opts?.skipRateLimit) {
    const rl = checkRateLimit();
    if (!rl.ok) throw new VeoRateLimitError(rl.retryInMs);
  }

  const totalTimeoutMs = opts?.totalTimeoutMs ?? 180_000;
  const pollIntervalMs = opts?.pollIntervalMs ?? 5_000;
  const signal = opts?.signal;
  const t0 = Date.now();

  const throwIfDone = () => {
    if (signal?.aborted) throw new VeoCanceledError();
    if (Date.now() - t0 > totalTimeoutMs) throw new VeoTimeoutError();
  };

  // 1) Start operation
  opts?.onProgress?.({ stage: 'إرسال الطلب إلى Veo…', elapsedMs: 0 });
  throwIfDone();

  const startRes = await supabase.functions.invoke('veo-start', {
    body: {
      prompt,
      aspectRatio: opts?.aspectRatio || '16:9',
      durationSec: opts?.durationSec || 8,
    },
  });
  throwIfDone();
  if (startRes.error || startRes.data?.error || !startRes.data?.operationName) {
    throw new Error('veo_start_failed');
  }
  const operationName: string = startRes.data.operationName;

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

    const poll = await supabase.functions.invoke('veo-poll', {
      body: { operationName },
    });
    throwIfDone();
    const d = poll.data || {};
    const elapsedMs = Date.now() - t0;
    opts?.onProgress?.({
      stage: d.stage || 'جاري المعالجة…',
      state: d.state,
      progressPct: d.progressPct ?? null,
      elapsedMs,
    });
    if (d.done) {
      if (d.error || !d.videoUrl) throw new Error('veo_no_video');
      return { videoUrl: d.videoUrl, mimeType: d.mimeType || 'video/mp4' };
    }
  }
}
