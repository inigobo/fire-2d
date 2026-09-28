import { FireSimulation } from './graphics/fire-simulation.js';

const KNOBS = new Set(['rise', 'curl', 'glow', 'trail']);

function settingsFrom(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new TypeError('Fire settings must be an object');
  }
  const settings = {};
  for (const [key, value] of Object.entries(values)) {
    if (!KNOBS.has(key) || !Number.isFinite(value)) {
      throw new TypeError(`Invalid fire setting: ${key}`);
    }
    settings[key] = Math.max(0, Math.min(100, value));
  }
  return settings;
}

/** Create one fire simulation for a canvas. The caller owns the canvas and fallback UI. */
export function createFire(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function' || typeof canvas.addEventListener !== 'function') {
    throw new TypeError('createFire requires a canvas element');
  }
  const target = options.interactionTarget ?? canvas.parentElement ?? canvas;
  if (typeof target.addEventListener !== 'function' || typeof target.getBoundingClientRect !== 'function') {
    throw new TypeError('interactionTarget must be an element');
  }
  const onStateChange = options.onStateChange ?? (() => {});
  if (typeof onStateChange !== 'function') throw new TypeError('onStateChange must be a function');

  let settings = settingsFrom(options.settings ?? {});
  let enabled = options.autoplay !== false;
  let simulation;
  let destroyed = false;

  function mount() {
    simulation = new FireSimulation(canvas, target, settings, enabled);
    onStateChange(enabled ? 'running' : 'paused');
  }
  function contextLost(event) {
    event.preventDefault();
    simulation?.destroy();
    simulation = undefined;
    onStateChange('context-lost');
  }
  function contextRestored() {
    if (destroyed) return;
    try { mount(); }
    catch (error) {
      simulation?.destroy();
      simulation = undefined;
      onStateChange('unavailable', error);
    }
  }

  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  try { mount(); }
  catch (error) {
    simulation?.destroy();
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.removeEventListener('webglcontextrestored', contextRestored);
    throw error;
  }

  return {
    setSettings(partial) {
      if (destroyed) return;
      const values = settingsFrom(partial);
      settings = { ...settings, ...values };
      simulation?.setSettings(values);
    },
    pause() {
      if (destroyed) return;
      enabled = false;
      simulation?.setEnabled(false);
      onStateChange('paused');
    },
    resume() {
      if (destroyed) return;
      enabled = true;
      simulation?.setEnabled(true);
      onStateChange(simulation ? 'running' : 'context-lost');
    },
    resize() { if (!destroyed) simulation?.resize(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      simulation?.destroy();
      simulation = undefined;
    },
  };
}
