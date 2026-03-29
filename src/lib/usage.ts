const USAGE_KEY = 'agon_usage_seconds_v1';
const MAX_FREE_SECONDS = 20 * 60; // 20 minutes

export function getUsedSeconds(): number {
  try {
    return parseInt(localStorage.getItem(USAGE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function addUsedSeconds(seconds: number) {
  const current = getUsedSeconds();
  localStorage.setItem(USAGE_KEY, String(current + seconds));
}

export function getRemainingSeconds(): number {
  return Math.max(0, MAX_FREE_SECONDS - getUsedSeconds());
}

export function canProduce(durationSec: number): boolean {
  return getRemainingSeconds() >= durationSec;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const MAX_FREE_MINUTES = 20;
