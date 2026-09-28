import test from 'node:test';
import assert from 'node:assert/strict';
import { FireSimulation } from '../src/graphics/fire-simulation.js';
import { FIRE_PRESETS, mergeSettings, settingsForPreset } from '../src/config.js';

function inputHarness() {
  return {
    stage: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 400 }) },
    enabled: true,
    inView: true,
    splats: [],
    previousPointer: null,
    activeTouch: null,
    addSplat: FireSimulation.prototype.addSplat,
  };
}

test('touch scrolling adds spaced heat pulses without intercepting the page', () => {
  const simulation = inputHarness();
  const start = {
    changedTouches: [{ identifier: 1, clientX: 110, clientY: 220 }],
    target: { closest: () => null },
    preventDefault: () => { throw new Error('Touch scrolling was intercepted'); },
  };
  FireSimulation.prototype.onTouchStart.call(simulation, start);
  FireSimulation.prototype.onTouchMove.call(simulation, { ...start, changedTouches: [{ identifier: 1, clientX: 110, clientY: 211 }] });
  assert.equal(simulation.splats.length, 1); // Tiny movement is skipped.
  FireSimulation.prototype.onTouchMove.call(simulation, { ...start, changedTouches: [{ identifier: 1, clientX: 110, clientY: 170 }] });
  assert.equal(simulation.splats.length, 2);
  assert.deepEqual([simulation.splats[0].x, simulation.splats[0].y], [0.5, 0.5]);
  assert.ok(simulation.splats[1].dy > 0);
});

test('downward swipe still lifts heat, then touch end stops injection', () => {
  const simulation = inputHarness();
  const start = { changedTouches: [{ identifier: 2, clientX: 110, clientY: 220 }], target: { closest: () => null } };
  FireSimulation.prototype.onTouchStart.call(simulation, start);
  FireSimulation.prototype.onTouchMove.call(simulation, { changedTouches: [{ identifier: 2, clientX: 110, clientY: 270 }] });
  assert.equal(simulation.splats.length, 2);
  assert.ok(simulation.splats[1].dy > 0);
  FireSimulation.prototype.onTouchEnd.call(simulation, { changedTouches: [{ identifier: 2 }] });
  FireSimulation.prototype.onTouchMove.call(simulation, { changedTouches: [{ identifier: 2, clientX: 110, clientY: 320 }] });
  assert.equal(simulation.splats.length, 2);
});

test('touching a control does not inject heat', () => {
  const simulation = inputHarness();
  FireSimulation.prototype.onTouchStart.call(simulation, {
    changedTouches: [{ identifier: 3, clientX: 110, clientY: 220 }],
    target: { closest: () => ({ tagName: 'BUTTON' }) },
  });
  assert.equal(simulation.splats.length, 0);
});

test('presets merge overrides without changing their frozen source', () => {
  const settings = settingsForPreset('candle', { glow: 130, emitter: { x: 0.75 } });
  assert.equal(settings.glow, 100);
  assert.equal(settings.emitter.x, 0.75);
  assert.equal(FIRE_PRESETS.candle.emitter.x, 0.52);
  const next = mergeSettings(settings, { emitter: { power: 1.2 } });
  assert.equal(next.emitter.x, 0.75);
  assert.equal(next.emitter.power, 1.2);
  assert.throws(() => settingsForPreset('unknown'), RangeError);
  assert.throws(() => mergeSettings(next, { emitter: { foo: 1 } }), TypeError);
});

test('offscreen simulation cancels its frame and resets elapsed time', t => {
  const oldDocument = globalThis.document;
  const oldRequest = globalThis.requestAnimationFrame;
  const oldCancel = globalThis.cancelAnimationFrame;
  let requested = 0;
  let cancelled = 0;
  globalThis.document = { hidden: false };
  globalThis.requestAnimationFrame = () => ++requested;
  globalThis.cancelAnimationFrame = id => { cancelled = id; };
  t.after(() => {
    globalThis.document = oldDocument;
    globalThis.requestAnimationFrame = oldRequest;
    globalThis.cancelAnimationFrame = oldCancel;
  });

  const simulation = { enabled: true, inView: true, frame: 0, velocity: {}, lastTime: 12 };
  FireSimulation.prototype.schedule.call(simulation);
  assert.equal(requested, 1);
  simulation.inView = false;
  FireSimulation.prototype.schedule.call(simulation);
  assert.equal(cancelled, 1);
  assert.equal(simulation.frame, 0);
  assert.equal(simulation.lastTime, 0);
});

test('failed framebuffer setup releases resources before listeners are attached', t => {
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  const deleted = { framebuffers: 0, programs: 0, textures: 0, vertexArrays: 0 };
  let stageListeners = 0;
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    TEXTURE_2D: 5, TEXTURE_MIN_FILTER: 6, TEXTURE_MAG_FILTER: 7,
    TEXTURE_WRAP_S: 8, TEXTURE_WRAP_T: 9, NEAREST: 10, CLAMP_TO_EDGE: 11,
    RGBA16F: 12, RGBA: 13, HALF_FLOAT: 14, FRAMEBUFFER: 15,
    COLOR_ATTACHMENT0: 16, FRAMEBUFFER_COMPLETE: 17, COLOR_BUFFER_BIT: 18,
    getExtension: () => ({}),
    createVertexArray: () => ({}), bindVertexArray: () => {},
    createShader: () => ({}), shaderSource: () => {}, compileShader: () => {},
    getShaderParameter: () => true, getShaderInfoLog: () => '', deleteShader: () => {},
    createProgram: () => ({}), attachShader: () => {}, linkProgram: () => {},
    getProgramParameter: () => true, getProgramInfoLog: () => '',
    deleteProgram: () => { deleted.programs += 1; },
    deleteVertexArray: () => { deleted.vertexArrays += 1; },
    createTexture: () => ({}), bindTexture: () => {}, texParameteri: () => {}, texImage2D: () => {},
    deleteTexture: () => { deleted.textures += 1; },
    createFramebuffer: () => ({}), bindFramebuffer: () => {}, framebufferTexture2D: () => {},
    checkFramebufferStatus: () => 0,
    deleteFramebuffer: () => { deleted.framebuffers += 1; },
  };
  const stage = {
    addEventListener: () => { stageListeners += 1; },
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  };
  globalThis.document = { hidden: false, addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 1000 };
  t.after(() => {
    globalThis.document = oldDocument;
    globalThis.window = oldWindow;
  });

  assert.throws(
    () => new FireSimulation({ getContext: () => gl }, stage),
    /Floating-point framebuffer is incomplete/,
  );
  assert.equal(stageListeners, 0);
  assert.equal(deleted.textures, 1);
  assert.equal(deleted.framebuffers, 1);
  assert.ok(deleted.programs > 0);
  assert.equal(deleted.vertexArrays, 1);
});
