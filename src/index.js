import { FireSimulation } from './graphics/fire-simulation.js';
import { mergeSettings, settingsForPreset } from './config.js';

export { FIRE_PRESETS } from './config.js';

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

  let settings = settingsForPreset(options.preset, options.settings);
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
      settings = mergeSettings(settings, partial);
      simulation?.setSettings(settings);
    },
    setPreset(name) {
      if (destroyed) return;
      settings = settingsForPreset(name);
      simulation?.setSettings(settings);
    },
    getSettings() { return mergeSettings(settings, {}); },
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
