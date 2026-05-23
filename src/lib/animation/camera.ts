/**
 * Camera system: computes transform offsets for each frame based on CameraMove type.
 */
import { CameraMove } from './types';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface CameraTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
}

export function computeCamera(
  move: CameraMove,
  localT: number,
  w: number,
  h: number,
  timeSec: number,
  intensity: number
): CameraTransform {
  const eased = easeInOutCubic(localT);
  const str = 0.5 + intensity * 0.5;

  switch (move) {
    case 'pan-left':
      return { offsetX: -eased * w * 0.08 * str, offsetY: 0, scale: 1.12, rotation: 0 };
    case 'pan-right':
      return { offsetX: eased * w * 0.08 * str, offsetY: 0, scale: 1.12, rotation: 0 };
    case 'zoom-in':
      return { offsetX: 0, offsetY: 0, scale: 1.05 + eased * 0.15 * str, rotation: 0 };
    case 'zoom-out':
      return { offsetX: 0, offsetY: 0, scale: 1.2 - eased * 0.1 * str, rotation: 0 };
    case 'shake': {
      const shakeX = Math.sin(timeSec * 25) * 8 * str * (1 - localT * 0.5);
      const shakeY = Math.cos(timeSec * 30) * 6 * str * (1 - localT * 0.5);
      return { offsetX: shakeX, offsetY: shakeY, scale: 1.12, rotation: Math.sin(timeSec * 15) * 0.01 * str };
    }
    case 'dolly':
      return { offsetX: 0, offsetY: -eased * h * 0.04 * str, scale: 1.08 + eased * 0.08 * str, rotation: 0 };
    case 'tilt-up':
      return { offsetX: 0, offsetY: eased * h * 0.06 * str, scale: 1.12, rotation: -eased * 0.015 * str };
    case 'tilt-down':
      return { offsetX: 0, offsetY: -eased * h * 0.06 * str, scale: 1.12, rotation: eased * 0.015 * str };
    case 'beat-pulse': {
      // Camera pulses with a 120 BPM beat for music/dance scenes.
      const bpm = 120;
      const beat = (timeSec * bpm) / 60;
      const beatPhase = beat - Math.floor(beat);
      const kick = Math.pow(1 - beatPhase, 2.5);
      const sway = Math.sin(beat * Math.PI) * 6 * str;
      return {
        offsetX: sway,
        offsetY: -kick * 4 * str,
        scale: 1.1 + kick * 0.06 * str,
        rotation: Math.sin(beat * Math.PI * 2) * 0.01 * str,
      };
    }
    case 'static':
    default: {
      // Even "static" has subtle drift for life
      const driftX = Math.sin(timeSec * 0.3) * 3;
      const driftY = Math.cos(timeSec * 0.2) * 2;
      return { offsetX: driftX, offsetY: driftY, scale: 1.08, rotation: 0 };
    }
  }
}
