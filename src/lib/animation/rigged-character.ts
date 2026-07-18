/**
 * Realistic rigged character: articulated skeleton drawn on top of the scene.
 * Provides full-body kinematics (head, torso, arms, legs) with per-action poses.
 * The rig gives the illusion of a real animated character rather than a moving image.
 */
import { ActionType } from './types';

export interface RigOptions {
  action: ActionType;
  timeSec: number;
  localT: number;
  intensity: number;
  direction: 'left' | 'right' | 'center';
  characterType?: 'realistic' | 'cartoon' | 'fantasy' | 'none' | 'auto';
  syllablesPerSec: number;
  width: number;
  height: number;
}

interface Point { x: number; y: number; }

function pt(x: number, y: number): Point { return { x, y }; }

function rotate(p: Point, pivot: Point, angle: number): Point {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx = p.x - pivot.x, dy = p.y - pivot.y;
  return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c };
}

function limb(from: Point, angle: number, length: number): Point {
  return { x: from.x + Math.cos(angle) * length, y: from.y + Math.sin(angle) * length };
}

interface Palette {
  skin: string;
  shirt: string;
  pants: string;
  outline: string;
  hair: string;
  accent: string;
}

function palette(type: RigOptions['characterType']): Palette {
  switch (type) {
    case 'fantasy':
      return { skin: '#e8c9a0', shirt: '#5b2a86', pants: '#2b1758', outline: '#1a0b2e', hair: '#f5c451', accent: '#9d7bff' };
    case 'cartoon':
      return { skin: '#ffd8b1', shirt: '#ff5a5f', pants: '#2b6cb0', outline: '#1a1a1a', hair: '#3a2417', accent: '#ffe066' };
    case 'none':
      return { skin: '#00000000', shirt: '#00000000', pants: '#00000000', outline: '#00000000', hair: '#00000000', accent: '#00000000' };
    case 'realistic':
    default:
      return { skin: '#d9a887', shirt: '#2b3a55', pants: '#1a1f2b', outline: '#0e0f13', hair: '#1c1208', accent: '#c9a34e' };
  }
}

/** Compute per-action pose angles (radians). Angles measured from +X axis, CW positive on canvas. */
function pose(o: RigOptions) {
  const { action, timeSec, localT, intensity, direction, syllablesPerSec } = o;
  const str = 0.4 + intensity * 0.7;
  const dir = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const breath = Math.sin(timeSec * 1.3) * 0.02;

  // Defaults (standing)
  let torsoTilt = breath;
  let headTilt = Math.sin(timeSec * 0.9) * 0.04;
  let shoulderL = Math.PI * 0.62;     // arms hang down-out
  let shoulderR = Math.PI * 0.38;
  let elbowL = 0.15;
  let elbowR = 0.15;
  let hipL = Math.PI * 0.52;
  let hipR = Math.PI * 0.48;
  let kneeL = 0.05;
  let kneeR = 0.05;
  let jawOpen = 0;
  let bodyBobY = Math.sin(timeSec * 1.3) * 2;
  let bodyBobX = 0;
  let travelX = 0;
  let eyeBlink = (timeSec % 4) < 0.15 ? 0.85 : 0;
  let mouthSmile = 0;

  switch (action) {
    case 'talking': {
      const s = Math.abs(Math.sin(timeSec * syllablesPerSec * Math.PI));
      jawOpen = s * 0.5 * str;
      const g = Math.sin(timeSec * 2.4);
      shoulderL = Math.PI * 0.6 - g * 0.15 * str;
      shoulderR = Math.PI * 0.4 + g * 0.15 * str;
      elbowL = 0.4 + g * 0.3 * str;
      elbowR = 0.4 - g * 0.3 * str;
      headTilt += Math.sin(timeSec * 1.6) * 0.05 * str;
      break;
    }
    case 'walking': {
      const c = Math.sin(timeSec * 4);
      hipL = Math.PI * 0.5 + c * 0.35 * str;
      hipR = Math.PI * 0.5 - c * 0.35 * str;
      kneeL = Math.max(0, c) * 0.5 * str;
      kneeR = Math.max(0, -c) * 0.5 * str;
      shoulderL = Math.PI * 0.62 - c * 0.3 * str;
      shoulderR = Math.PI * 0.38 + c * 0.3 * str;
      elbowL = 0.3 + Math.abs(c) * 0.25;
      elbowR = 0.3 + Math.abs(c) * 0.25;
      bodyBobY += Math.abs(c) * 4 * str;
      travelX = dir * localT * 60 * str;
      break;
    }
    case 'running': {
      const c = Math.sin(timeSec * 8);
      hipL = Math.PI * 0.5 + c * 0.6 * str;
      hipR = Math.PI * 0.5 - c * 0.6 * str;
      kneeL = Math.max(0, c) * 0.9 * str + 0.2;
      kneeR = Math.max(0, -c) * 0.9 * str + 0.2;
      shoulderL = Math.PI * 0.62 - c * 0.7 * str;
      shoulderR = Math.PI * 0.38 + c * 0.7 * str;
      elbowL = 1.1;
      elbowR = 1.1;
      torsoTilt = 0.15 * dir + breath;
      bodyBobY += Math.abs(c) * 8 * str;
      travelX = dir * localT * 140 * str;
      break;
    }
    case 'chasing': {
      const c = Math.sin(timeSec * 7);
      hipL = Math.PI * 0.5 + c * 0.55 * str;
      hipR = Math.PI * 0.5 - c * 0.55 * str;
      kneeL = Math.max(0, c) * 0.8 * str + 0.15;
      kneeR = Math.max(0, -c) * 0.8 * str + 0.15;
      shoulderL = Math.PI * 0.55 - c * 0.9 * str;
      shoulderR = Math.PI * 0.45 + c * 0.9 * str;
      elbowL = 1.3; elbowR = 1.3;
      torsoTilt = 0.2 * dir + breath;
      bodyBobY += Math.abs(c) * 7 * str;
      travelX = dir * localT * 170 * str;
      break;
    }
    case 'fighting': {
      const punch = Math.sin(timeSec * 5);
      const punching = punch > 0;
      if (punching) {
        // Right straight punch
        shoulderR = Math.PI * 0.02 + (dir >= 0 ? 0 : Math.PI);
        elbowR = -0.9 - punch * 0.6;
        shoulderL = Math.PI * 0.75;
        elbowL = 1.2;
      } else {
        // Left hook
        shoulderL = Math.PI * 0.98 + (dir <= 0 ? 0 : -Math.PI);
        elbowL = -0.9 + punch * 0.6;
        shoulderR = Math.PI * 0.25;
        elbowR = 1.2;
      }
      hipL = Math.PI * 0.55; hipR = Math.PI * 0.45;
      kneeL = 0.3; kneeR = 0.2;
      torsoTilt = punch * 0.12 * str;
      bodyBobX = Math.sin(timeSec * 10) * 4 * str;
      break;
    }
    case 'emotional': {
      const sob = Math.sin(timeSec * 3) ** 2;
      torsoTilt = -0.12 + sob * 0.05;
      headTilt = 0.25;
      shoulderL = Math.PI * 0.75; shoulderR = Math.PI * 0.25;
      elbowL = 1.4; elbowR = 1.4; // hands up to face
      jawOpen = sob * 0.2;
      bodyBobY += sob * 4;
      break;
    }
    case 'dramatic': {
      const t = localT;
      shoulderL = Math.PI * 0.85 + Math.sin(timeSec) * 0.1;
      shoulderR = Math.PI * 0.15 - Math.sin(timeSec) * 0.1;
      elbowL = 0.1; elbowR = 0.1; // arms wide open
      headTilt = -0.15 - t * 0.1;
      torsoTilt = breath - 0.05;
      break;
    }
    case 'dancing': {
      const bpm = 120;
      const beat = (timeSec * bpm) / 60;
      const bp = beat - Math.floor(beat);
      const kick = Math.pow(1 - bp, 2.2);
      const sway = Math.sin(beat * Math.PI);
      shoulderL = Math.PI * 0.55 - sway * 0.5 - kick * 0.3;
      shoulderR = Math.PI * 0.45 + sway * 0.5 + kick * 0.3;
      elbowL = 0.6 + kick * 0.4;
      elbowR = 0.6 + kick * 0.4;
      hipL = Math.PI * 0.5 + sway * 0.25;
      hipR = Math.PI * 0.5 - sway * 0.25;
      kneeL = 0.2 + kick * 0.35;
      kneeR = 0.2 + Math.abs(sway) * 0.25;
      torsoTilt = sway * 0.15;
      headTilt = sway * 0.2;
      bodyBobY -= kick * 12;
      bodyBobX += sway * 10;
      break;
    }
    case 'idle':
    default:
      // Occasional weight shift
      torsoTilt += Math.sin(timeSec * 0.4) * 0.03;
      break;
  }

  return {
    torsoTilt, headTilt,
    shoulderL, shoulderR, elbowL, elbowR,
    hipL, hipR, kneeL, kneeR,
    jawOpen, bodyBobX, bodyBobY, travelX,
    eyeBlink, mouthSmile, dir,
  };
}

export function drawRiggedCharacter(
  ctx: CanvasRenderingContext2D,
  o: RigOptions
) {
  if (o.characterType === 'none') return;
  const p = pose(o);
  const pal = palette(o.characterType || 'realistic');

  // Character sits in the lower-center of frame
  const baseX = o.width * 0.5 + p.bodyBobX + p.travelX + (o.direction === 'left' ? -o.width * 0.12 : o.direction === 'right' ? o.width * 0.12 : 0);
  const groundY = o.height * 0.92;

  // Proportions (relative to canvas height for scale independence)
  const H = o.height;
  const headR = H * 0.055;
  const neckLen = H * 0.025;
  const torsoLen = H * 0.18;
  const upperArm = H * 0.11;
  const foreArm = H * 0.1;
  const thigh = H * 0.13;
  const shin = H * 0.13;
  const shoulderW = H * 0.075;
  const hipW = H * 0.055;

  // Anchors
  const pelvis = pt(baseX, groundY - shin - thigh + p.bodyBobY);
  const chest = rotate(pt(pelvis.x, pelvis.y - torsoLen), pelvis, p.torsoTilt);
  const neck = rotate(pt(pelvis.x, pelvis.y - torsoLen - neckLen), pelvis, p.torsoTilt);
  const head = rotate(pt(neck.x, neck.y - headR), neck, p.headTilt);

  const shoulderLp = rotate(pt(chest.x - shoulderW / 2, chest.y + H * 0.005), chest, p.torsoTilt);
  const shoulderRp = rotate(pt(chest.x + shoulderW / 2, chest.y + H * 0.005), chest, p.torsoTilt);
  const hipLp = pt(pelvis.x - hipW / 2, pelvis.y);
  const hipRp = pt(pelvis.x + hipW / 2, pelvis.y);

  const elbowLpt = limb(shoulderLp, p.shoulderL, upperArm);
  const elbowRpt = limb(shoulderRp, p.shoulderR, upperArm);
  const handL = limb(elbowLpt, p.shoulderL + p.elbowL, foreArm);
  const handR = limb(elbowRpt, p.shoulderR - p.elbowR, foreArm);

  const kneeLpt = limb(hipLp, p.hipL, thigh);
  const kneeRpt = limb(hipRp, p.hipR, thigh);
  const footL = limb(kneeLpt, p.hipL - p.kneeL, shin);
  const footR = limb(kneeRpt, p.hipR + p.kneeR, shin);

  // Ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(baseX, groundY + 4, H * 0.09, H * 0.014, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Style
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawBone = (a: Point, b: Point, thickness: number, color: string) => {
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = thickness + 3;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };

  // Back leg first (right leg = back when facing left, and vice versa)
  const backIsRight = p.dir <= 0;
  const legPairs = backIsRight
    ? [[hipRp, kneeRpt, footR], [hipLp, kneeLpt, footL]]
    : [[hipLp, kneeLpt, footL], [hipRp, kneeRpt, footR]];
  for (const [hip, knee, foot] of legPairs) {
    drawBone(hip, knee, H * 0.028, pal.pants);
    drawBone(knee, foot, H * 0.024, pal.pants);
    // Shoe
    ctx.fillStyle = pal.outline;
    ctx.beginPath();
    ctx.ellipse(foot.x, foot.y + 2, H * 0.028, H * 0.012, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Back arm
  const backArm = backIsRight ? [shoulderRp, elbowRpt, handR] : [shoulderLp, elbowLpt, handL];
  drawBone(backArm[0], backArm[1], H * 0.024, pal.shirt);
  drawBone(backArm[1], backArm[2], H * 0.02, pal.skin);

  // Torso
  ctx.save();
  ctx.fillStyle = pal.shirt;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(shoulderLp.x, shoulderLp.y);
  ctx.lineTo(shoulderRp.x, shoulderRp.y);
  ctx.lineTo(hipRp.x, hipRp.y);
  ctx.lineTo(hipLp.x, hipLp.y);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Accent stripe
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo((shoulderLp.x + shoulderRp.x) / 2, (shoulderLp.y + shoulderRp.y) / 2);
  ctx.lineTo((hipLp.x + hipRp.x) / 2, (hipLp.y + hipRp.y) / 2);
  ctx.stroke();
  ctx.restore();

  // Front arm
  const frontArm = backIsRight ? [shoulderLp, elbowLpt, handL] : [shoulderRp, elbowRpt, handR];
  drawBone(frontArm[0], frontArm[1], H * 0.024, pal.shirt);
  drawBone(frontArm[1], frontArm[2], H * 0.02, pal.skin);
  // Hand
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 2;
  for (const h of [handL, handR]) {
    ctx.beginPath(); ctx.arc(h.x, h.y, H * 0.017, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // Neck
  drawBone(chest, neck, H * 0.02, pal.skin);

  // Head
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(p.headTilt * 0.5);
  // Face
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, headR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Hair (cap)
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.arc(0, -headR * 0.15, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95, false);
  ctx.closePath(); ctx.fill();
  // Eyes
  const eyeY = -headR * 0.08;
  const eyeDX = headR * 0.35;
  const eyeOpen = 1 - p.eyeBlink;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-eyeDX, eyeY, headR * 0.13, headR * 0.16 * eyeOpen, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(eyeDX, eyeY, headR * 0.13, headR * 0.16 * eyeOpen, 0, 0, Math.PI * 2); ctx.fill();
  if (eyeOpen > 0.2) {
    const pupilShift = p.dir * headR * 0.04;
    ctx.fillStyle = '#0b0b0b';
    ctx.beginPath(); ctx.arc(-eyeDX + pupilShift, eyeY, headR * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeDX + pupilShift, eyeY, headR * 0.06, 0, Math.PI * 2); ctx.fill();
  }
  // Eyebrows (angle by action)
  const brow = o.action === 'fighting' || o.action === 'chasing' ? -0.3
    : o.action === 'emotional' ? 0.35
    : o.action === 'dramatic' ? -0.15 : 0;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-eyeDX - headR * 0.15, eyeY - headR * 0.28 + brow * headR * 0.2);
  ctx.lineTo(-eyeDX + headR * 0.15, eyeY - headR * 0.28 - brow * headR * 0.2);
  ctx.moveTo(eyeDX - headR * 0.15, eyeY - headR * 0.28 - brow * headR * 0.2);
  ctx.lineTo(eyeDX + headR * 0.15, eyeY - headR * 0.28 + brow * headR * 0.2);
  ctx.stroke();
  // Mouth (opens with jaw)
  const mouthY = headR * 0.35;
  const mouthW = headR * 0.35;
  const mouthH = Math.max(1, p.jawOpen * headR * 0.9);
  ctx.fillStyle = '#3a1a1a';
  ctx.beginPath();
  ctx.ellipse(0, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
