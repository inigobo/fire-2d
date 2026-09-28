export type FireEmitter = {
  /** Horizontal centre, 0–1 from left. */
  x?: number;
  /** Vertical centre, 0–1 from bottom. */
  y?: number;
  /** Emitter width relative to canvas height, 0.01–0.4. */
  width?: number;
  /** Emitter height relative to canvas height, 0.01–0.4. */
  height?: number;
  /** Heat and density emission multiplier, 0–3. */
  power?: number;
};

export type FireSettings = {
  /** Upward heat force, from 0 to 100. */
  rise?: number;
  /** Restored small-scale swirl, from 0 to 100. */
  curl?: number;
  /** Display halo strength, from 0 to 100. */
  glow?: number;
  /** Visible density persistence, from 0 to 100. */
  trail?: number;
  emitter?: FireEmitter;
};

export type FirePreset = 'candle' | 'hearth' | 'bonfire';
export const FIRE_PRESETS: Readonly<Record<FirePreset, Readonly<Required<Omit<FireSettings, 'emitter'>> & { emitter: Readonly<Required<FireEmitter>> }>>>;

export type FireState = 'running' | 'paused' | 'context-lost' | 'unavailable';

export type FireOptions = {
  /** The element whose dimensions and pointer events drive the simulation. Defaults to the canvas parent. */
  interactionTarget?: HTMLElement;
  /** Named starting configuration. Defaults to 'hearth'. */
  preset?: FirePreset;
  /** Overrides any fields in the selected preset. */
  settings?: FireSettings;
  /** Set false to create a paused simulation, e.g. for reduced motion. Defaults to true. */
  autoplay?: boolean;
  onStateChange?: (state: FireState, error?: Error) => void;
};

export type FireController = {
  setSettings(settings: FireSettings): void;
  /** Replace the whole configuration with a named preset. */
  setPreset(preset: FirePreset): void;
  /** Return an independent snapshot of the active configuration. */
  getSettings(): Required<Omit<FireSettings, 'emitter'>> & { emitter: Required<FireEmitter> };
  pause(): void;
  resume(): void;
  resize(): void;
  destroy(): void;
};

/** Requires WebGL2 and EXT_color_buffer_float; throws when unavailable. */
export function createFire(canvas: HTMLCanvasElement, options?: FireOptions): FireController;
