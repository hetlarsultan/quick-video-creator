/**
 * Animated Video Engine — barrel export.
 * Re-exports the main generator and types for external use.
 */
export { generateAnimatedVideo } from './animation/renderer';
export type { AnimatedVideoOptions, SceneMotion, ActionType, CameraMove } from './animation/types';
