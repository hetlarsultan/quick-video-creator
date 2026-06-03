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

/**
 * Generate a real cinematic video using Google AI Studio (Veo) via Gemini API.
 * Long-running: takes 30s–3min. The edge function handles submission + polling.
 */
export async function generateVeoVideo(
  prompt: string,
  opts?: {
    aspectRatio?: '16:9' | '9:16';
    durationSec?: number;
    maxAttempts?: number;
    onAttempt?: (attempt: number, total: number) => void;
  }
): Promise<VeoVideoResult> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    opts?.onAttempt?.(attempt, maxAttempts);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-veo', {
        body: {
          prompt,
          aspectRatio: opts?.aspectRatio || '16:9',
          durationSec: opts?.durationSec || 8,
        },
      });
      if (error) throw new Error('veo_invoke');
      if (data?.error || data?.fallback) throw new Error('veo_busy');
      if (!data?.videoUrl) throw new Error('veo_no_video');
      return { videoUrl: data.videoUrl, mimeType: data.mimeType || 'video/mp4' };
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s … (silent — no console noise)
        const wait = 1000 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('veo_failed');
}
