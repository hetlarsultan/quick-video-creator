/**
 * Talking-head video generator.
 * Applies a "breathing" + subtle face motion effect to a still image,
 * simulating lip-sync / talking animation using Canvas + MediaRecorder.
 * The effect oscillates scale & position around the center-lower area
 * of the image (where a face/mouth typically is) in sync with speech cadence.
 */

export interface TalkingVideoOptions {
  imageUrl: string;
  durationSec: number;
  text: string;
  width?: number;
  height?: number;
  onProgress?: (pct: number) => void;
}

/** Load an image as HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Generate a "talking" video where the character appears to speak.
 * Uses oscillating transforms to simulate mouth/face movement.
 */
export async function generateTalkingVideo(options: TalkingVideoOptions): Promise<Blob> {
  const {
    imageUrl,
    durationSec,
    text,
    width = 1080,
    height = 1080,
    onProgress,
  } = options;

  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fps = 30;
  const totalFrames = durationSec * fps;

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

  // Pre-compute "speech energy" per frame based on text length
  // Simulate phoneme-like energy bursts
  const wordCount = text.split(/\s+/).length;
  const syllablesPerSec = Math.max(2, wordCount / durationSec * 2.5);

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
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
      const timeSec = frame / fps;

      // --- Compute animation parameters ---

      // 1) Breathing: slow subtle scale oscillation
      const breathScale = 1 + Math.sin(timeSec * 1.2 * Math.PI) * 0.008;

      // 2) Speech energy: fast oscillation simulating mouth opening
      const speechFreq = syllablesPerSec * 2 * Math.PI;
      const speechEnvelope = Math.sin(timeSec * 0.8 * Math.PI) ** 2; // Fade in/out
      const speechEnergy = Math.abs(Math.sin(timeSec * speechFreq)) * speechEnvelope;

      // 3) Head micro-nod (vertical bob while speaking)
      const nodY = Math.sin(timeSec * 3.5) * speechEnergy * 3;

      // 4) Slight horizontal sway
      const swayX = Math.sin(timeSec * 1.8) * 1.5;

      // 5) Jaw/mouth area stretch (scale Y slightly more in lower half)
      const jawStretch = 1 + speechEnergy * 0.012;

      // Combined scale
      const scale = breathScale * (1 + speechEnergy * 0.015);

      // --- Draw ---
      ctx.clearRect(0, 0, width, height);

      // Cover image maintaining aspect ratio
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

      ctx.save();

      // Transform from center
      const cx = width / 2 + swayX;
      const cy = height / 2 + nodY;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale * jawStretch);
      ctx.translate(-cx, -cy);

      // Slight Ken Burns drift for cinematic feel
      const driftX = Math.sin(t * Math.PI * 2) * width * 0.01;
      const driftY = -t * height * 0.015;

      const drawW = width * 1.08; // Slight overscale to avoid edges
      const drawH = height * 1.08;
      const offsetX = (width - drawW) / 2 + driftX;
      const offsetY = (height - drawH) / 2 + driftY;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, offsetX, offsetY, drawW, drawH);
      ctx.restore();

      // Subtle cinematic vignette
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.3,
        width / 2, height / 2, width * 0.7
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Speech indicator: subtle glow near bottom center (mouth area)
      if (speechEnergy > 0.3) {
        const glowGrad = ctx.createRadialGradient(
          width / 2, height * 0.72, 10,
          width / 2, height * 0.72, width * 0.15
        );
        glowGrad.addColorStop(0, `rgba(255,255,255,${speechEnergy * 0.06})`);
        glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, width, height);
      }

      frame++;
      if (onProgress) onProgress(Math.round((frame / totalFrames) * 100));
      requestAnimationFrame(renderFrame);
    }

    renderFrame();
  });
}
