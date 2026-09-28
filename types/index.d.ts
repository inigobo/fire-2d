export type FireSettings = {
  /** Upward heat force, from 0 to 100. */
  rise?: number;
  /** Restored small-scale swirl, from 0 to 100. */
  curl?: number;
  /** Display halo strength, from 0 to 100. */
  glow?: number;
  /** Visible density persistence, from 0 to 100. */
  trail?: number;
};

export type FireState = 'running' | 'paused' | 'context-lost' | 'unavailable';

export type FireOptions = {
  /** The element whose dimensions and pointer events drive the simulation. Defaults to the canvas parent. */
  interactionTarget?: HTMLElement;
  settings?: FireSettings;
  /** Set false to create a paused simulation, e.g. for reduced motion. Defaults to true. */
  autoplay?: boolean;
  onStateChange?: (state: FireState, error?: Error) => void;
};

export type FireController = {
  setSettings(settings: FireSettings): void;
  pause(): void;
  resume(): void;
  resize(): void;
  destroy(): void;
};

/** Requires WebGL2 and EXT_color_buffer_float; throws when unavailable. */
export function createFire(canvas: HTMLCanvasElement, options?: FireOptions): FireController;
