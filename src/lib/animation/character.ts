/**
 * Character animation: body movement, talking, action-based transforms.
 */
import { ActionType } from './types';

export interface CharacterTransform {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  /** Extra vertical stretch for mouth region */
  jawStretch: number;
  /** Energy level 0-1 for effects */
  energy: number;
}

export function computeCharacter(
  action: ActionType,
  timeSec: number,
  localT: number,
  intensity: number,
  syllablesPerSec: number,
  direction: 'left' | 'right' | 'center'
): CharacterTransform {
  const str = 0.5 + intensity * 0.5;

  // Base breathing (always present)
  const breathScale = 1 + Math.sin(timeSec * 1.2 * Math.PI) * 0.006;
  const breathY = Math.sin(timeSec * 1.2 * Math.PI) * 2;

  // Speech energy (for talking actions)
  const speechFreq = syllablesPerSec * 2 * Math.PI;
  const speechEnvelope = Math.sin(timeSec * 0.6 * Math.PI) ** 2;
  const speechEnergy = Math.abs(Math.sin(timeSec * speechFreq)) * speechEnvelope;

  const dirMul = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;

  switch (action) {
    case 'talking':
      return {
        offsetX: Math.sin(timeSec * 1.8) * 3 * str + dirMul * 2,
        offsetY: breathY + Math.sin(timeSec * 3.5) * speechEnergy * 5 * str,
        scaleX: breathScale,
        scaleY: breathScale * (1 + speechEnergy * 0.018 * str),
        rotation: Math.sin(timeSec * 2.2) * 0.008 * str,
        jawStretch: 1 + speechEnergy * 0.02 * str,
        energy: speechEnergy,
      };

    case 'walking':
      return {
        offsetX: dirMul * localT * 40 * str + Math.sin(timeSec * 4) * 6 * str,
        offsetY: breathY + Math.abs(Math.sin(timeSec * 4)) * 8 * str,
        scaleX: breathScale,
        scaleY: breathScale + Math.abs(Math.sin(timeSec * 4)) * 0.01,
        rotation: Math.sin(timeSec * 4) * 0.02 * str,
        jawStretch: 1,
        energy: 0.3,
      };

    case 'running':
      return {
        offsetX: dirMul * localT * 80 * str + Math.sin(timeSec * 7) * 10 * str,
        offsetY: breathY + Math.abs(Math.sin(timeSec * 7)) * 15 * str,
        scaleX: breathScale + Math.sin(timeSec * 7) * 0.01,
        scaleY: breathScale + Math.abs(Math.sin(timeSec * 7)) * 0.02,
        rotation: Math.sin(timeSec * 7) * 0.03 * str,
        jawStretch: 1,
        energy: 0.6 + Math.abs(Math.sin(timeSec * 7)) * 0.3,
      };

    case 'fighting': {
      const punchCycle = Math.sin(timeSec * 6);
      const impact = Math.max(0, Math.sin(timeSec * 12)) ** 3;
      return {
        offsetX: punchCycle * 25 * str * dirMul + Math.sin(timeSec * 15) * impact * 10,
        offsetY: breathY + Math.sin(timeSec * 5) * 12 * str - impact * 8,
        scaleX: breathScale + impact * 0.03,
        scaleY: breathScale + Math.abs(punchCycle) * 0.02,
        rotation: punchCycle * 0.04 * str + impact * 0.02 * dirMul,
        jawStretch: 1 + impact * 0.01,
        energy: 0.5 + impact * 0.5,
      };
    }

    case 'chasing':
      return {
        offsetX: dirMul * localT * 100 * str + Math.sin(timeSec * 6) * 8,
        offsetY: breathY + Math.abs(Math.sin(timeSec * 6)) * 12 * str,
        scaleX: breathScale + 0.01,
        scaleY: breathScale + Math.abs(Math.sin(timeSec * 6)) * 0.015,
        rotation: Math.sin(timeSec * 6) * 0.025 * str + dirMul * 0.01,
        jawStretch: 1,
        energy: 0.7,
      };

    case 'emotional': {
      const sob = Math.sin(timeSec * 3) ** 2;
      return {
        offsetX: Math.sin(timeSec * 2) * 4 * str,
        offsetY: breathY + sob * 6 * str,
        scaleX: breathScale - sob * 0.005,
        scaleY: breathScale + sob * 0.012,
        rotation: Math.sin(timeSec * 1.5) * 0.012 * str,
        jawStretch: 1 + sob * 0.015,
        energy: sob * 0.6,
      };
    }

    case 'dramatic': {
      const drama = easeInOutSine(localT);
      return {
        offsetX: Math.sin(timeSec * 1.2) * 5 * str,
        offsetY: breathY - drama * 10 * str,
        scaleX: breathScale + drama * 0.02,
        scaleY: breathScale + drama * 0.02,
        rotation: Math.sin(timeSec * 0.8) * 0.01 * str,
        jawStretch: 1,
        energy: drama * 0.5,
      };
    }

    case 'idle':
    default:
      return {
        offsetX: Math.sin(timeSec * 0.8) * 2,
        offsetY: breathY,
        scaleX: breathScale,
        scaleY: breathScale,
        rotation: Math.sin(timeSec * 0.5) * 0.003,
        jawStretch: 1,
        energy: 0.1,
      };
  }
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
