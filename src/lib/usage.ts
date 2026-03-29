// App is always free — no usage limits
export function getUsedSeconds(): number {
  return 0;
}

export function addUsedSeconds(_seconds: number) {
  // No-op: app is always free
}

export function getRemainingSeconds(): number {
  return Infinity;
}

export function canProduce(_durationSec: number): boolean {
  return true;
}

export function formatTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds)) return '∞';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const MAX_FREE_MINUTES = Infinity;
