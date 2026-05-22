/**
 * Main renderer: composites scene images with camera, character, and effects.
 */

import { AnimatedVideoOptions, LoadedScene, SceneMotion } from './types';
import { computeCamera } from './camera';
import { computeCharacter } from './character';
import { createParticles, drawParticles, drawVignette, drawSpeedLines, drawImpactEffect, drawMouthAnimation, drawFilmGrain } from './effects';

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
  scale: number, alpha: number
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

const defaultMotion: SceneMotion = {
  action: 'idle',
  camera: 'static',
  intensity: 0.5,
  characterDirection: 'center',
  description: '',
};

export async function generateAnimatedVideo(options: AnimatedVideoOptions): Promise<Blob> {
  const {
    sceneImages,
    durationSec,
    prompt,
    width: requestedWidth = 1080,
    height: requestedHeight = 1080,
    enableTalking = false,
    audioBlob,
    sceneMotions,
    onProgress,
  } = options;

  if (sceneImages.length === 0) throw new Error('No scene images provided');

  // ⚡ Adaptive resolution: on mobile / low-mem devices, render smaller for speed & smoothness.
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const deviceMem = (navigator as any).deviceMemory || 4;
  const scaleFactor = isMobile || deviceMem < 4 ? 0.66 : 1; // 720x720 on mobile
  const width = Math.round(requestedWidth * scaleFactor);
  const height = Math.round(requestedHeight * scaleFactor);

  const images = await Promise.all(sceneImages.map(loadImage));

  const scenes: LoadedScene[] = images.map((img, i) => ({
    img,
    motion: sceneMotions?.[i] || { ...defaultMotion },
  }));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;

  const fps = isMobile ? 24 : 30;
  const totalFrames = durationSec * fps;
  const framesPerScene = totalFrames / scenes.length;
  const transitionFrames = Math.min(Math.floor(framesPerScene * 0.25), fps * 1.5);

  // --- Merge video + audio streams ---
  // Note: we DEFER audio source.start() until recorder.start() to avoid sync drift.
  const videoStream = canvas.captureStream(fps);
  let combinedStream: MediaStream;
  let audioSource: AudioBufferSourceNode | null = null;

  if (audioBlob) {
    try {
      const audioCtx = new AudioContext();
      const arrayBuf = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuf.slice(0));
      audioSource = audioCtx.createBufferSource();
      audioSource.buffer = audioBuffer;
      const dest = audioCtx.createMediaStreamDestination();
      audioSource.connect(dest);
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
    } catch (e) {
      console.warn('Audio merge failed:', e);
      combinedStream = videoStream;
    }
  } else {
    combinedStream = videoStream;
  }

  // 🍎 Safari/iOS fallback: prefer mp4 if webm is not supported.
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ];
  const mimeType = candidates.find(m => {
    try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
  }) || '';
  const containerType = mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';

  const recorder = new MediaRecorder(
    combinedStream,
    mimeType ? { mimeType, videoBitsPerSecond: isMobile ? 2_500_000 : 5_000_000 } : { videoBitsPerSecond: isMobile ? 2_500_000 : 5_000_000 }
  );
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const particles = createParticles(35, width, height);
  const wordCount = prompt.split(/\s+/).length;
  const syllablesPerSec = Math.max(2, (wordCount / durationSec) * 2.5);

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: containerType }));
    recorder.onerror = (e) => reject(e);
    recorder.start();
    // Start audio in the same tick as recorder for tight A/V sync.
    try { audioSource?.start(); } catch (e) { console.warn('audio start failed', e); }

    let frame = 0;

    function renderFrame() {
      if (frame >= totalFrames) { recorder.stop(); return; }

      const timeSec = frame / fps;
      const sceneIdx = Math.min(Math.floor(frame / framesPerScene), scenes.length - 1);
      const localFrame = frame - sceneIdx * framesPerScene;
      const localT = localFrame / framesPerScene;

      const scene = scenes[sceneIdx];
      const nextScene = scenes[Math.min(sceneIdx + 1, scenes.length - 1)];

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // Camera
      const cam = computeCamera(scene.motion.camera, localT, width, height, timeSec, scene.motion.intensity);

      // Character animation
      const char = computeCharacter(
        enableTalking ? (scene.motion.action === 'idle' ? 'talking' : scene.motion.action) : scene.motion.action,
        timeSec, localT, scene.motion.intensity, syllablesPerSec, scene.motion.characterDirection
      );

      const totalOx = cam.offsetX + char.offsetX;
      const totalOy = cam.offsetY + char.offsetY;
      const totalScale = cam.scale * char.scaleX;
      const totalRotation = cam.rotation + char.rotation;

      // Check transition
      const isTransitioning = localFrame > (framesPerScene - transitionFrames) && sceneIdx < scenes.length - 1;

      if (isTransitioning) {
        const transProgress = (localFrame - (framesPerScene - transitionFrames)) / transitionFrames;
        const eased = easeInOutCubic(transProgress);

        // Current scene fading out
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(totalRotation);
        ctx.scale(char.scaleX, char.scaleY * char.jawStretch);
        ctx.translate(-width / 2, -height / 2);
        drawCover(ctx, scene.img, width, height, totalOx, totalOy, cam.scale, 1 - eased);
        ctx.restore();

        // Next scene fading in
        const nextCam = computeCamera(nextScene.motion.camera, transProgress * 0.2, width, height, timeSec, nextScene.motion.intensity);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.translate(-width / 2, -height / 2);
        drawCover(ctx, nextScene.img, width, height, nextCam.offsetX, nextCam.offsetY, nextCam.scale, eased);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(totalRotation);
        ctx.scale(char.scaleX, char.scaleY * char.jawStretch);
        ctx.translate(-width / 2, -height / 2);
        drawCover(ctx, scene.img, width, height, totalOx, totalOy, cam.scale, 1);
        ctx.restore();
      }

      // --- Effects layer ---

      // Speed lines for running/chasing/fighting
      if (['running', 'chasing', 'fighting'].includes(scene.motion.action)) {
        drawSpeedLines(ctx, width, height, scene.motion.intensity * char.energy, scene.motion.characterDirection);
      }

      // Impact for fighting
      if (scene.motion.action === 'fighting') {
        drawImpactEffect(ctx, width, height, char.energy, timeSec);
      }

      // Mouth animation for talking
      if (enableTalking && ['talking', 'emotional'].includes(scene.motion.action)) {
        drawMouthAnimation(ctx, width, height, char.energy, timeSec);
      }

      // Particles
      drawParticles(ctx, particles, width, height);

      // Vignette
      drawVignette(ctx, width, height, scene.motion.action === 'dramatic' ? 0.5 : 0.35);

      // Talking glow
      if (enableTalking && char.energy > 0.25) {
        const glow = ctx.createRadialGradient(width / 2, height * 0.7, 5, width / 2, height * 0.7, width * 0.12);
        glow.addColorStop(0, `rgba(255,255,255,${char.energy * 0.08})`);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // Film grain (every other frame)
      if (frame % 2 === 0) drawFilmGrain(ctx, width, height);

      frame++;
      if (onProgress) onProgress(Math.round((frame / totalFrames) * 100));
      requestAnimationFrame(renderFrame);
    }

    renderFrame();
  });
}
