/**
 * Export utilities: convert WebM (MediaRecorder output) to MP4 using ffmpeg.wasm.
 * Loads ffmpeg only on demand to keep the initial bundle small.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

/**
 * Convert a WebM blob (or URL) to MP4 (H.264 + AAC) for mobile gallery saving.
 * Falls back to a renamed WebM if conversion fails.
 */
export async function convertWebmToMp4(
  source: Blob | string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  try {
    const ffmpeg = await getFFmpeg();
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)));
    }
    const inputData = await fetchFile(source);
    await ffmpeg.writeFile('input.webm', inputData);
    // Fast preset, mobile-compatible (yuv420p, +faststart for streaming).
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4',
    ]);
    const data = await ffmpeg.readFile('output.mp4');
    return new Blob([data as Uint8Array], { type: 'video/mp4' });
  } catch (err) {
    console.warn('MP4 conversion failed, returning WebM:', err);
    if (source instanceof Blob) return source;
    const res = await fetch(source);
    return await res.blob();
  }
}

/**
 * Trigger browser download for a blob (works on mobile — saves to Downloads/Files).
 */
export function downloadBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}