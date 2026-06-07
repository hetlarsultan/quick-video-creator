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
    const bytes = data as Uint8Array;
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Blob([buf], { type: 'video/mp4' });
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

/**
 * Merge a video (webm/mp4 url or Blob) with an audio Blob using ffmpeg.wasm.
 * Tries fast stream-copy first; falls back to re-encode if needed.
 */
export async function mergeAudioWithVideo(
  videoSource: Blob | string,
  audioBlob: Blob,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)));
  }
  const vData = await fetchFile(videoSource);
  const aData = await fetchFile(audioBlob);
  const vName = (typeof videoSource === 'string' && videoSource.includes('.mp4')) ? 'in.mp4' : 'in.webm';
  // Pick extension from blob type
  let aName = 'in_audio.bin';
  const type = audioBlob.type || '';
  if (type.includes('mpeg') || type.includes('mp3')) aName = 'in_audio.mp3';
  else if (type.includes('wav')) aName = 'in_audio.wav';
  else if (type.includes('ogg')) aName = 'in_audio.ogg';
  else if (type.includes('m4a') || type.includes('mp4')) aName = 'in_audio.m4a';
  else if (type.includes('webm')) aName = 'in_audio.webm';
  else aName = 'in_audio.mp3';

  await ffmpeg.writeFile(vName, vData);
  await ffmpeg.writeFile(aName, aData);

  // Re-encode video for broad compatibility (mp4 output is the universal choice for share/save).
  try {
    await ffmpeg.exec([
      '-i', vName,
      '-i', aName,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      'merged.mp4',
    ]);
  } catch (e) {
    console.warn('ffmpeg merge encode failed, retrying with copy', e);
    await ffmpeg.exec([
      '-i', vName, '-i', aName,
      '-c', 'copy', '-shortest',
      'merged.mp4',
    ]);
  }
  const data = await ffmpeg.readFile('merged.mp4');
  const bytes = data as Uint8Array;
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buf], { type: 'video/mp4' });
}