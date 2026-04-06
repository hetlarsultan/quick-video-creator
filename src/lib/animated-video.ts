/**
 * Animated Video Engine — multi-scene cinematic video with audio merging.
 *
 * Generates smooth crossfade transitions between AI scene images,
 * with parallax, particles, talking character effects, and
 * TTS audio merged directly into the video file.
 */

export interface AnimatedVideoOptions {
  sceneImages: string[];
  durationSec: number;
  prompt: string;
  width?: number;
  height?: number;
  enableTalking?: boolean;
  audioBlob?: Blob | null;
  onProgress?: (pct: number) => void;
}

interface LoadedScene {
  img: HTMLImageElement;
  motionX: number;
  motionY: number;
  rotation: number;
  zoomDir: number;
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

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number, h: number,
  offsetX: number, offsetY: number,
  scale: number,
  alpha: number
) {
  const imgAspect = img.width / img.height;
  const canvasAspect = w / h;
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

  const drawW = w * scale;
  const drawH = h * scale;
  const dx = (w - drawW) / 2 + offsetX;
  const dy = (h - drawH) / 2 + offsetY;

  ctx.globalAlpha = alpha;
  ctx.drawImage(img, srcX, srcY, srcW, srcH, dx, dy, drawW, drawH);
  ctx.globalAlpha = 1;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  color: string;
}

function createParticles(count: number, w: number, h: number): Particle[] {
  const colors = [
    'rgba(255,255,255,', 'rgba(255,220,100,', 'rgba(180,220,255,',
    'rgba(100,255,180,', 'rgba(255,180,200,',
  ];
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -Math.random() * 1.2 - 0.3,
    size: Math.random() * 3 + 1,
    alpha: Math.random() * 0.6 + 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number) {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.alpha *= 0.998;
    if (p.y < -10) { p.y = h + 10; p.alpha = Math.random() * 0.6 + 0.2; }
    if (p.x < -10) p.x = w + 10;
    if (p.x > w + 10) p.x = -10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `${p.color}${p.alpha})`;
    ctx.fill();
  }
}

/**
 * Generate animated video with optional audio merged in.
 */
export async function generateAnimatedVideo(options: AnimatedVideoOptions): Promise<Blob> {
  const {
    sceneImages,
    durationSec,
    prompt,
    width = 1080,
    height = 1080,
    enableTalking = false,
    audioBlob,
    onProgress,
  } = options;

  if (sceneImages.length === 0) throw new Error('No scene images provided');

  const images = await Promise.all(sceneImages.map(loadImage));

  const scenes: LoadedScene[] = images.map((img, i) => ({
    img,
    motionX: (Math.random() - 0.5) * 40,
    motionY: (Math.random() - 0.5) * 20,
    rotation: (Math.random() - 0.5) * 0.02,
    zoomDir: i % 2 === 0 ? 1 : -1,
  }));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fps = 30;
  const totalFrames = durationSec * fps;
  const framesPerScene = totalFrames / scenes.length;
  const transitionFrames = Math.min(Math.floor(framesPerScene * 0.35), fps * 2);

  // --- Merge video + audio streams ---
  const videoStream = canvas.captureStream(fps);
  let combinedStream: MediaStream;

  if (audioBlob) {
    try {
      const audioCtx = new AudioContext();
      const arrayBuf = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.start();

      // Combine video tracks + audio tracks
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
    } catch (e) {
      console.warn('Audio merge failed, continuing without audio:', e);
      combinedStream = videoStream;
    }
  } else {
    combinedStream = videoStream;
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const particles = createParticles(40, width, height);
  const wordCount = prompt.split(/\s+/).length;
  const syllablesPerSec = Math.max(2, (wordCount / durationSec) * 2.5);

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

      const timeSec = frame / fps;
      const sceneIdx = Math.min(Math.floor(frame / framesPerScene), scenes.length - 1);
      const localFrame = frame - sceneIdx * framesPerScene;
      const localT = localFrame / framesPerScene;

      const scene = scenes[sceneIdx];
      const nextScene = scenes[Math.min(sceneIdx + 1, scenes.length - 1)];

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      const sceneScale = 1.12 + scene.zoomDir * localT * 0.08;
      const ox = Math.sin(timeSec * 0.7 + sceneIdx) * scene.motionX * localT;
      const oy = Math.cos(timeSec * 0.5 + sceneIdx) * scene.motionY * localT;

      let talkOx = 0, talkOy = 0, talkScale = 1;
      if (enableTalking) {
        const speechFreq = syllablesPerSec * 2 * Math.PI;
        const envelope = Math.sin(timeSec * 0.6 * Math.PI) ** 2;
        const energy = Math.abs(Math.sin(timeSec * speechFreq)) * envelope;
        talkOy = Math.sin(timeSec * 3.5) * energy * 4;
        talkOx = Math.sin(timeSec * 1.8) * 2;
        talkScale = 1 + energy * 0.015;
      }

      const isTransitioning = localFrame > (framesPerScene - transitionFrames) && sceneIdx < scenes.length - 1;

      if (isTransitioning) {
        const transProgress = (localFrame - (framesPerScene - transitionFrames)) / transitionFrames;
        const eased = easeInOutCubic(transProgress);

        ctx.save();
        ctx.translate(width / 2 + talkOx, height / 2 + talkOy);
        ctx.scale(talkScale, talkScale);
        ctx.translate(-width / 2, -height / 2);
        drawCover(ctx, scene.img, width, height, ox, oy, sceneScale, 1 - eased);
        ctx.restore();

        const nextScale = 1.12 + nextScene.zoomDir * transProgress * 0.04;
        const nox = Math.sin(timeSec * 0.5) * nextScene.motionX * 0.2;
        const noy = Math.cos(timeSec * 0.3) * nextScene.motionY * 0.2;

        ctx.save();
        ctx.translate(width / 2 + talkOx, height / 2 + talkOy);
        ctx.scale(talkScale, talkScale);
        ctx.translate(-width / 2, -height / 2);
        drawCover(ctx, nextScene.img, width, height, nox, noy, nextScale, eased);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(width / 2 + talkOx, height / 2 + talkOy);
        ctx.scale(talkScale, talkScale);
        ctx.translate(-width / 2, -height / 2);
        drawCover(ctx, scene.img, width, height, ox, oy, sceneScale, 1);
        ctx.restore();
      }

      drawParticles(ctx, particles, width, height);

      // Vignette
      const vig = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.28,
        width / 2, height / 2, width * 0.72
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);

      // Talking glow
      if (enableTalking) {
        const speechFreq = syllablesPerSec * 2 * Math.PI;
        const envelope = Math.sin(timeSec * 0.6 * Math.PI) ** 2;
        const energy = Math.abs(Math.sin(timeSec * speechFreq)) * envelope;
        if (energy > 0.25) {
          const glow = ctx.createRadialGradient(
            width / 2, height * 0.7, 5,
            width / 2, height * 0.7, width * 0.12
          );
          glow.addColorStop(0, `rgba(255,255,255,${energy * 0.08})`);
          glow.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);
        }
      }

      // Film grain
      if (frame % 2 === 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`;
        ctx.fillRect(0, 0, width, height);
      }

      frame++;
      if (onProgress) onProgress(Math.round((frame / totalFrames) * 100));
      requestAnimationFrame(renderFrame);
    }

    renderFrame();
  });
}
