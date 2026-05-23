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
    width = 1080,
    height = 1080,
    enableTalking = false,
    audioBlob,
    sceneMotions,
    onProgress,
  } = options;

  if (sceneImages.length === 0) throw new Error('No scene images provided');

  const images = await Promise.all(sceneImages.map(loadImage));

  const scenes: LoadedScene[] = images.map((img, i) => ({
    img,
    motion: sceneMotions?.[i] || { ...defaultMotion },
  }));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fps = 30;
  const totalFrames = durationSec * fps;
  const framesPerScene = totalFrames / scenes.length;
  const transitionFrames = Math.min(Math.floor(framesPerScene * 0.25), fps * 1.5);

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

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const particles = createParticles(35, width, height);
  const wordCount = prompt.split(/\s+/).length;
  const syllablesPerSec = Math.max(2, (wordCount / durationSec) * 2.5);

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    recorder.onerror = (e) => reject(e);
    recorder.start();

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

      // Dance disco effect: pulsing color wash + light rays on the beat
      if (scene.motion.action === 'dancing') {
        const bpm = 120;
        const beat = (timeSec * bpm) / 60;
        const beatPhase = beat - Math.floor(beat);
        const kick = Math.pow(1 - beatPhase, 2.5);
        // Rotating disco color wash
        const hue = (timeSec * 80) % 360;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${0.12 + kick * 0.18})`;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
        // Beat flash
        if (kick > 0.7) {
          ctx.fillStyle = `rgba(255,255,255,${(kick - 0.7) * 0.5})`;
          ctx.fillRect(0, 0, width, height);
        }
        // Radial light spotlights moving with the beat
        const cx = width / 2 + Math.sin(beat * Math.PI) * width * 0.2;
        const cy = height * 0.45;
        const spot = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.5);
        spot.addColorStop(0, `hsla(${(hue + 180) % 360},90%,65%,${0.18 + kick * 0.2})`);
        spot.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spot;
        ctx.fillRect(0, 0, width, height);
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
