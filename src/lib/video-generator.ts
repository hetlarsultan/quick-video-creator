/**
 * Client-side video generator using Canvas + MediaRecorder.
 * Applies Ken Burns (pan/zoom) animation to a still image to produce a real video.
 */

export interface VideoGenerationOptions {
  imageUrl: string;
  durationSec: number;
  prompt: string;
  type: 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'ken-burns';
  width?: number;
  height?: number;
  onProgress?: (pct: number) => void;
}

type AnimationStyle = VideoGenerationOptions['type'];

function pickAnimation(prompt: string): AnimationStyle {
  const lower = prompt.toLowerCase();
  if (lower.includes('فضاء') || lower.includes('space') || lower.includes('زوم')) return 'zoom-in';
  if (lower.includes('بحر') || lower.includes('طبيعة') || lower.includes('nature')) return 'pan-left';
  if (lower.includes('مدينة') || lower.includes('city')) return 'pan-right';
  const styles: AnimationStyle[] = ['ken-burns', 'zoom-in', 'pan-left', 'pan-right', 'zoom-out'];
  return styles[Math.floor(Math.random() * styles.length)];
}

function getTransform(style: AnimationStyle, t: number) {
  // t goes from 0 → 1 over the duration
  switch (style) {
    case 'zoom-in':
      return { scale: 1 + t * 0.35, dx: 0, dy: 0 };
    case 'zoom-out':
      return { scale: 1.35 - t * 0.35, dx: 0, dy: 0 };
    case 'pan-left':
      return { scale: 1.15, dx: -t * 0.12, dy: 0 };
    case 'pan-right':
      return { scale: 1.15, dx: t * 0.12, dy: 0 };
    case 'ken-burns':
    default: {
      const scale = 1 + t * 0.25;
      const dx = t * 0.06;
      const dy = -t * 0.04;
      return { scale, dx, dy };
    }
  }
}

export async function generateVideoFromImage(options: VideoGenerationOptions): Promise<Blob> {
  const {
    imageUrl,
    durationSec,
    prompt,
    width = 1280,
    height = 720,
    onProgress,
  } = options;

  const animStyle = options.type === 'ken-burns' ? pickAnimation(prompt) : options.type;

  // Load the image
  const img = await loadImage(imageUrl);

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fps = 30;
  const totalFrames = durationSec * fps;

  // Use MediaRecorder to capture canvas stream
  const stream = canvas.captureStream(fps);
  
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);

    recorder.start();

    let frame = 0;

    function renderFrame() {
      if (frame >= totalFrames) {
        recorder.stop();
        return;
      }

      const t = frame / totalFrames;
      const { scale, dx, dy } = getTransform(animStyle, t);

      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Center the transform
      const drawW = width * scale;
      const drawH = height * scale;
      const offsetX = (width - drawW) / 2 + dx * width;
      const offsetY = (height - drawH) / 2 + dy * height;

      // Draw image covering canvas with animation transform
      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;
      let srcW: number, srcH: number;

      if (imgAspect > canvasAspect) {
        srcH = img.height;
        srcW = srcH * canvasAspect;
      } else {
        srcW = img.width;
        srcH = srcW / canvasAspect;
      }
      const srcX = (img.width - srcW) / 2;
      const srcY = (img.height - srcH) / 2;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, offsetX, offsetY, drawW, drawH);
      ctx.restore();

      // Add subtle vignette overlay
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.3,
        width / 2, height / 2, width * 0.75
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      frame++;
      if (onProgress) onProgress(Math.round((frame / totalFrames) * 100));

      // Use requestAnimationFrame for smooth rendering  
      requestAnimationFrame(renderFrame);
    }

    renderFrame();
  });
}

export async function generateMultiSceneVideo(
  images: string[],
  durationSec: number,
  prompt: string,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  if (images.length === 0) throw new Error('No images provided');
  if (images.length === 1) {
    return generateVideoFromImage({
      imageUrl: images[0],
      durationSec,
      prompt,
      type: 'ken-burns',
      onProgress,
    });
  }

  // Multi-scene: divide duration among images with transitions
  const sceneDuration = durationSec / images.length;
  const blobs: Blob[] = [];

  for (let i = 0; i < images.length; i++) {
    const styles: AnimationStyle[] = ['zoom-in', 'pan-left', 'ken-burns', 'pan-right', 'zoom-out'];
    const blob = await generateVideoFromImage({
      imageUrl: images[i],
      durationSec: sceneDuration,
      prompt,
      type: styles[i % styles.length],
      onProgress: (pct) => {
        const total = ((i / images.length) + (pct / 100) / images.length) * 100;
        if (onProgress) onProgress(Math.round(total));
      },
    });
    blobs.push(blob);
  }

  // Concatenate blobs (simple merge for WebM)
  return new Blob(blobs, { type: 'video/webm' });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
