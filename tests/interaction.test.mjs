import test from 'node:test';
import assert from 'node:assert/strict';
import { FireSimulation } from '../src/graphics/fire-simulation.js';

function inputHarness() {
  return {
    stage: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 400 }) },
    enabled: true,
    inView: true,
    splats: [],
    previousPointer: null,
  };
}

test('touch contact injects one pulse without intercepting scroll movement', () => {
  const simulation = inputHarness();
  const event = {
    pointerType: 'touch', pointerId: 1, clientX: 110, clientY: 220,
    target: { closest: () => null },
    preventDefault: () => { throw new Error('Touch scrolling was intercepted'); },
  };
  FireSimulation.prototype.onPointerDown.call(simulation, event);
  FireSimulation.prototype.onPointerUp.call(simulation, event);
  assert.equal(simulation.splats.length, 1);
  assert.deepEqual([simulation.splats[0].x, simulation.splats[0].y], [0.5, 0.5]);
  assert.ok(simulation.splats[0].dy > 0);
});

test('a scrolling swipe does not inject a pulse', () => {
  const simulation = inputHarness();
  const start = { pointerType: 'touch', pointerId: 2, clientX: 110, clientY: 220, target: { closest: () => null } };
  FireSimulation.prototype.onPointerDown.call(simulation, start);
  FireSimulation.prototype.onPointerMove.call(simulation, { ...start, clientY: 170 });
  FireSimulation.prototype.onPointerUp.call(simulation, { ...start, clientY: 170 });
  assert.equal(simulation.splats.length, 0);
});

test('touching a control does not inject heat', () => {
  const simulation = inputHarness();
  FireSimulation.prototype.onPointerDown.call(simulation, {
    pointerType: 'touch', clientX: 110, clientY: 220,
    target: { closest: () => ({ tagName: 'BUTTON' }) },
  });
  assert.equal(simulation.splats.length, 0);
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
