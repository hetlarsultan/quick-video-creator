/**
 * Types for the cinematic animation engine.
 */

export type ActionType = 'idle' | 'talking' | 'walking' | 'running' | 'fighting' | 'chasing' | 'emotional' | 'dramatic';
export type CameraMove = 'static' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'shake' | 'dolly' | 'tilt-up' | 'tilt-down';

export interface SceneMotion {
  action: ActionType;
  camera: CameraMove;
  intensity: number; // 0-1
  characterDirection: 'left' | 'right' | 'center';
  description: string;
}

export interface AnimatedVideoOptions {
  sceneImages: string[];
  durationSec: number;
  prompt: string;
  width?: number;
  height?: number;
  enableTalking?: boolean;
  audioBlob?: Blob | null;
  sceneMotions?: SceneMotion[];
  onProgress?: (pct: number) => void;
}

export interface LoadedScene {
  img: HTMLImageElement;
  motion: SceneMotion;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
}
