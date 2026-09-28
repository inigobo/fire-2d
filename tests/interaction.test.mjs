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
