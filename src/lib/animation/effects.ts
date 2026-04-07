/**
 * Visual effects: particles, vignette, speed lines, impact, motion blur.
 */
import { Particle, ActionType } from './types';

export function createParticles(count: number, w: number, h: number): Particle[] {
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
    life: 1,
  }));
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number) {
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

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.35) {
  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

export function drawSpeedLines(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number, direction: 'left' | 'right' | 'center') {
  const lineCount = Math.floor(intensity * 15);
  ctx.save();
  ctx.globalAlpha = intensity * 0.3;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;

  for (let i = 0; i < lineCount; i++) {
    const y = Math.random() * h;
    const len = 40 + Math.random() * 80 * intensity;
    let startX: number;
    
    if (direction === 'right') {
      startX = Math.random() * w;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + len, y + (Math.random() - 0.5) * 5);
      ctx.stroke();
    } else if (direction === 'left') {
      startX = Math.random() * w;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX - len, y + (Math.random() - 0.5) * 5);
      ctx.stroke();
    } else {
      // Radial speed lines from center
      const angle = Math.random() * Math.PI * 2;
      const dist = w * 0.3 + Math.random() * w * 0.3;
      const cx = w / 2 + Math.cos(angle) * dist;
      const cy = h / 2 + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawImpactEffect(ctx: CanvasRenderingContext2D, w: number, h: number, energy: number, timeSec: number) {
  if (energy < 0.4) return;

  // Flash
  ctx.save();
  ctx.globalAlpha = (energy - 0.4) * 0.15;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Impact lines from center
  const lineCount = Math.floor(energy * 8);
  ctx.save();
  ctx.globalAlpha = energy * 0.25;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2 + timeSec;
    const innerR = w * 0.05;
    const outerR = w * 0.12 + energy * w * 0.08;
    ctx.beginPath();
    ctx.moveTo(w / 2 + Math.cos(angle) * innerR, h / 2 + Math.sin(angle) * innerR);
    ctx.lineTo(w / 2 + Math.cos(angle) * outerR, h / 2 + Math.sin(angle) * outerR);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawMouthAnimation(ctx: CanvasRenderingContext2D, w: number, h: number, energy: number, timeSec: number) {
  // Draw stylized animated mouth overlay in lower-center face region
  const mouthCx = w / 2;
  const mouthCy = h * 0.62;
  const mouthWidth = w * 0.06;
  const mouthHeight = energy * w * 0.025;

  if (mouthHeight < 1) return;

  ctx.save();
  ctx.globalAlpha = 0.15 + energy * 0.1;

  // Dark mouth shadow
  ctx.beginPath();
  ctx.ellipse(mouthCx, mouthCy, mouthWidth, mouthHeight + 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  // Mouth interior
  ctx.beginPath();
  ctx.ellipse(mouthCx, mouthCy, mouthWidth * 0.85, mouthHeight, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(60,0,0,0.25)';
  ctx.fill();

  // Highlight on upper lip
  ctx.beginPath();
  ctx.ellipse(mouthCx, mouthCy - mouthHeight * 0.5, mouthWidth * 0.6, 2, 0, 0, Math.PI);
  ctx.strokeStyle = 'rgba(255,200,180,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

export function drawFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`;
  ctx.fillRect(0, 0, w, h);
}
