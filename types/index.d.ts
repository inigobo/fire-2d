export type FireEmitter = {
  /** Horizontal centre, 0–1 from left. */
  x?: number;
  /** Vertical centre, 0–1 from bottom. */
  y?: number;
  /** Emitter width relative to canvas height, 0.01–0.4. */
  width?: number;
  /** Emitter height relative to canvas height, 0.01–0.4. */
  height?: number;
  /** Emission/base-jet multiplier, 0–3. Zero also disables emitter-centred display haze. */
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
  /** Heat loss, 0–100 (lower = longer glow); default 40 preserves 1.2/s cooling. */
  cooling?: number;
  /** Velocity damping, 0–100 (higher = slower drift); default 10 preserves 0.3/s drag. Not viscosity. */
  damping?: number;
  /** One-time random heat pulses on first animation, rounded and clamped to 0–24. */
  startupPulses?: number;
  /** Sustained opening in simulation seconds, 0–20. Default 0 keeps one-shot pulses. */
  startupDuration?: number;
  /** Opening pulse strength, 0–4. Default 1; does not change cursor input. */
  startupStrength?: number;
  /** Opening shape. Serpentine uses one moving brush when startupPulses > 0. */
  startupPattern?: 'scatter' | 'serpentine';
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
  /** Replay random pulses. Defaults to startupPulses; replaces any pending burst. */
  burst(count?: number): void;
  pause(): void;
  resume(): void;
  resize(): void;
  destroy(): void;
};

/** Requires WebGL2 and EXT_color_buffer_float; throws when unavailable. */
export function createFire(canvas: HTMLCanvasElement, options?: FireOptions): FireController;
