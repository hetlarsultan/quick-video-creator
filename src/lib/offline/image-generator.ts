/**
 * Offline procedural image generator using Canvas API.
 * Creates illustrated scene images without any network calls.
 */

type EnvType = string;

interface DrawConfig {
  environment: EnvType;
  sceneDescription: string;
  characterType: string;
  sceneIndex: number;
  totalScenes: number;
}

const PALETTES: Record<string, { bg: string[]; accent: string; ground: string }> = {
  'animated-nature': { bg: ['#87CEEB', '#98FB98', '#228B22'], accent: '#FFD700', ground: '#2E8B57' },
  'night-city': { bg: ['#0a0a2e', '#1a1a4e', '#2a0a3e'], accent: '#ff00ff', ground: '#1a1a2e' },
  'space': { bg: ['#000011', '#0a0a30', '#000022'], accent: '#00bfff', ground: '#111133' },
  'underwater': { bg: ['#003366', '#004488', '#006699'], accent: '#00ffcc', ground: '#002244' },
  'desert': { bg: ['#f4a460', '#daa520', '#cd853f'], accent: '#ff6347', ground: '#d2691e' },
  'indoor': { bg: ['#f5f0e1', '#e8dcc8', '#d4c5a9'], accent: '#8b4513', ground: '#a0522d' },
  'forest': { bg: ['#013220', '#024a2e', '#1a472a'], accent: '#adff2f', ground: '#0a3a1a' },
  'school': { bg: ['#f0f0e8', '#e0e0d0', '#d0d0c0'], accent: '#4169e1', ground: '#808070' },
  'park': { bg: ['#87ceeb', '#90ee90', '#3cb371'], accent: '#ff69b4', ground: '#228b22' },
};

function getRandomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, colors: string[]) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h * 0.6;
    const r = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.7 + 0.3})`;
    ctx.fill();
  }
}

function drawTrees(ctx: CanvasRenderingContext2D, w: number, h: number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = getRandomBetween(20, w - 20);
    const baseY = h * 0.65 + Math.random() * h * 0.1;
    const treeH = getRandomBetween(80, 180);
    const trunkW = getRandomBetween(8, 15);

    // Trunk
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(x - trunkW / 2, baseY - treeH * 0.3, trunkW, treeH * 0.3);

    // Canopy
    ctx.beginPath();
    ctx.moveTo(x, baseY - treeH);
    ctx.lineTo(x + treeH * 0.35, baseY - treeH * 0.3);
    ctx.lineTo(x - treeH * 0.35, baseY - treeH * 0.3);
    ctx.closePath();
    ctx.fillStyle = `hsl(${120 + Math.random() * 30}, ${60 + Math.random() * 20}%, ${25 + Math.random() * 15}%)`;
    ctx.fill();
  }
}

function drawBuildings(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const buildingCount = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < buildingCount; i++) {
    const bw = getRandomBetween(40, 100);
    const bh = getRandomBetween(120, 350);
    const x = (w / buildingCount) * i + Math.random() * 20;
    const y = h * 0.7 - bh;

    ctx.fillStyle = `hsl(${240 + Math.random() * 20}, 30%, ${10 + Math.random() * 15}%)`;
    ctx.fillRect(x, y, bw, bh + h * 0.3);

    // Windows
    for (let wy = y + 10; wy < y + bh; wy += 20) {
      for (let wx = x + 8; wx < x + bw - 8; wx += 16) {
        ctx.fillStyle = Math.random() > 0.3
          ? `hsl(${40 + Math.random() * 20}, 90%, ${70 + Math.random() * 20}%)`
          : '#111';
        ctx.fillRect(wx, wy, 8, 10);
      }
    }
  }
}

function drawWater(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Bubbles
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = getRandomBetween(3, 20);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Light rays
  for (let i = 0; i < 5; i++) {
    const x = getRandomBetween(0, w);
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 40, h);
    ctx.lineTo(x + 40, h);
    ctx.closePath();
    ctx.fillStyle = '#aaddff';
    ctx.fill();
    ctx.restore();
  }
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  for (let x = 0; x <= w; x += 30) {
    ctx.lineTo(x, h * 0.7 + Math.sin(x * 0.02) * 10);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}

function drawSimpleCharacter(ctx: CanvasRenderingContext2D, w: number, h: number, type: string, facing: 'left' | 'right' | 'center') {
  const cx = w * (facing === 'left' ? 0.35 : facing === 'right' ? 0.65 : 0.5);
  const cy = h * 0.55;
  const size = Math.min(w, h) * 0.12;

  ctx.save();
  if (facing === 'left') {
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-cx, 0);
  }

  if (type === 'cartoon' || type === 'auto') {
    // Head
    ctx.beginPath();
    ctx.arc(cx, cy - size * 1.2, size * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc80';
    ctx.fill();
    ctx.strokeStyle = '#e0a060';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx - size * 0.15, cy - size * 1.3, size * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.15, cy - size * 1.3, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#4488cc';
    ctx.fillRect(cx - size * 0.35, cy - size * 0.6, size * 0.7, size * 1.2);

    // Legs
    ctx.fillStyle = '#335577';
    ctx.fillRect(cx - size * 0.3, cy + size * 0.6, size * 0.22, size * 0.6);
    ctx.fillRect(cx + size * 0.08, cy + size * 0.6, size * 0.22, size * 0.6);
  } else if (type === 'realistic') {
    // Simplified realistic silhouette
    ctx.fillStyle = '#6a4e3a';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 1.2, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a3a5a';
    ctx.fillRect(cx - size * 0.3, cy - size * 0.7, size * 0.6, size * 1.3);
    ctx.fillRect(cx - size * 0.25, cy + size * 0.6, size * 0.2, size * 0.7);
    ctx.fillRect(cx + size * 0.05, cy + size * 0.6, size * 0.2, size * 0.7);
  } else if (type === 'fantasy') {
    // Fantasy with glow
    const glow = ctx.createRadialGradient(cx, cy - size, 5, cx, cy - size, size * 2);
    glow.addColorStop(0, 'rgba(138,43,226,0.4)');
    glow.addColorStop(1, 'rgba(138,43,226,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - size * 2, cy - size * 3, size * 4, size * 4);

    ctx.beginPath();
    ctx.arc(cx, cy - size * 1.2, size * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#dda0dd';
    ctx.fill();

    // Wizard hat
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 2.5);
    ctx.lineTo(cx + size * 0.5, cy - size * 1.6);
    ctx.lineTo(cx - size * 0.5, cy - size * 1.6);
    ctx.closePath();
    ctx.fillStyle = '#4b0082';
    ctx.fill();

    ctx.fillStyle = '#6a0dad';
    ctx.fillRect(cx - size * 0.35, cy - size * 0.6, size * 0.7, size * 1.2);
  }

  ctx.restore();
}

function drawSceneLabel(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, index: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const boxH = 50;
  ctx.fillRect(0, h - boxH, w, boxH);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const displayText = text.length > 60 ? text.slice(0, 57) + '...' : text;
  ctx.fillText(displayText, w / 2, h - boxH / 2);

  // Scene number badge
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(30, 30, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${index + 1}`, 30, 31);

  ctx.restore();
}

/**
 * Generate a single scene image as a data URL using Canvas.
 */
export function generateOfflineImage(config: DrawConfig): string {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const palette = PALETTES[config.environment] || PALETTES['animated-nature'];

  // Draw background
  drawSky(ctx, W, H, palette.bg);

  // Environment-specific elements
  switch (config.environment) {
    case 'animated-nature':
    case 'park':
    case 'forest':
      drawGround(ctx, W, H, palette.ground);
      drawTrees(ctx, W, H, 6 + Math.floor(Math.random() * 4));
      break;
    case 'night-city':
      drawBuildings(ctx, W, H);
      break;
    case 'space':
      drawStars(ctx, W, H, 200);
      break;
    case 'underwater':
      drawWater(ctx, W, H);
      break;
    case 'desert':
      drawGround(ctx, W, H, palette.ground);
      // Sand dunes
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const dx = getRandomBetween(0, W);
        ctx.arc(dx, H * 0.75, getRandomBetween(80, 200), Math.PI, 0);
        ctx.fillStyle = `hsl(30, ${50 + Math.random() * 20}%, ${60 + Math.random() * 15}%)`;
        ctx.fill();
      }
      break;
    case 'indoor':
    case 'school':
      drawGround(ctx, W, H, palette.ground);
      // Floor
      ctx.fillStyle = palette.bg[2];
      ctx.fillRect(0, H * 0.7, W, H * 0.3);
      // Door
      ctx.fillStyle = '#6b3a20';
      ctx.fillRect(W * 0.7, H * 0.35, W * 0.12, H * 0.35);
      break;
    default:
      drawGround(ctx, W, H, palette.ground);
  }

  // Draw character
  if (config.characterType !== 'none') {
    const facing = config.sceneIndex % 2 === 0 ? 'right' : 'left';
    drawSimpleCharacter(ctx, W, H, config.characterType, facing as any);
  }

  // Accent lighting
  const accentGlow = ctx.createRadialGradient(W * 0.3, H * 0.3, 10, W * 0.3, H * 0.3, W * 0.5);
  accentGlow.addColorStop(0, `${palette.accent}22`);
  accentGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = accentGlow;
  ctx.fillRect(0, 0, W, H);

  // Scene label
  drawSceneLabel(ctx, W, H, config.sceneDescription, config.sceneIndex);

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Generate multiple scene images offline.
 */
export function generateOfflineSceneImages(
  descriptions: string[],
  environment: string,
  characterType: string
): string[] {
  return descriptions.map((desc, i) =>
    generateOfflineImage({
      environment,
      sceneDescription: desc,
      characterType,
      sceneIndex: i,
      totalScenes: descriptions.length,
    })
  );
}
