const emitter = (x, y, width, height, power) => Object.freeze({ x, y, width, height, power });

/** Named starting points. Override any field with `settings` when embedding. */
export const FIRE_PRESETS = Object.freeze({
  candle: Object.freeze({ rise: 42, curl: 18, glow: 40, trail: 45, cooling: 40, damping: 10, startupPulses: 0, startupDuration: 0, startupStrength: 1, startupPattern: 'scatter', emitter: emitter(0.52, 0.10, 0.045, 0.06, 0.65) }),
  hearth: Object.freeze({ rise: 55, curl: 42, glow: 64, trail: 58, cooling: 40, damping: 10, startupPulses: 8, startupDuration: 0, startupStrength: 1, startupPattern: 'scatter', emitter: emitter(0.52, 0.115, 0.09, 0.075, 1) }),
  bonfire: Object.freeze({ rise: 78, curl: 70, glow: 80, trail: 70, cooling: 40, damping: 10, startupPulses: 12, startupDuration: 0, startupStrength: 1, startupPattern: 'scatter', emitter: emitter(0.5, 0.11, 0.14, 0.1, 1.35) }),
});

const LIMITS = Object.freeze({ rise: [0, 100], curl: [0, 100], glow: [0, 100], trail: [0, 100], cooling: [0, 100], damping: [0, 100], startupPulses: [0, 24], startupDuration: [0, 20], startupStrength: [0, 4] });
const EMITTER_LIMITS = Object.freeze({ x: [0, 1], y: [0, 1], width: [0.01, 0.4], height: [0.01, 0.4], power: [0, 3] });

function clampSetting(key, value, limits, label = key) {
  if (!Object.hasOwn(limits, key) || !Number.isFinite(value)) throw new TypeError(`Invalid fire setting: ${label}`);
  const [minimum, maximum] = limits[key];
  return Math.max(minimum, Math.min(maximum, value));
}

export function mergeSettings(current, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Fire settings must be an object');
  const next = { ...current, emitter: { ...current.emitter } };
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'emitter') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Emitter must be an object');
      for (const [part, number] of Object.entries(value)) {
        next.emitter[part] = clampSetting(part, number, EMITTER_LIMITS, `emitter.${part}`);
      }
    } else if (key === 'startupPattern') {
      if (!['scatter', 'serpentine', 'swirls'].includes(value)) throw new TypeError('Unknown startup pattern');
      next.startupPattern = value;
    } else {
      next[key] = clampSetting(key, value, LIMITS);
      if (key === 'startupPulses') next[key] = Math.round(next[key]);
    }
  }
  return next;
}

export function settingsForPreset(name = 'hearth', overrides = {}) {
  if (!Object.hasOwn(FIRE_PRESETS, name)) throw new RangeError(`Unknown fire preset: ${name}`);
  return mergeSettings(FIRE_PRESETS[name], overrides);
}
