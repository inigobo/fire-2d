import test from 'node:test';
import assert from 'node:assert/strict';
import { createPulses } from '../src/graphics/pulses.js';
import { FireSimulation } from '../src/graphics/fire-simulation.js';
import { settingsForPreset } from '../src/config.js';

test('random bursts stay bounded, spread through the field, and lift heat', () => {
  const pulses = createPulses(100, () => 0.5);
  assert.equal(pulses.length, 24);
  assert.equal(new Set(pulses.map(p => `${p.x},${p.y}`)).size, 24);
  for (const p of pulses) {
    assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1);
    assert.ok(p.dy > 0 && p.dy <= 0.07);
    assert.ok(p.radius > 0 && p.intensity > 0);
  }
  assert.deepEqual(createPulses(0), []);
  assert.deepEqual(createPulses(-1), []);
  assert.throws(() => createPulses(NaN), TypeError);
  assert.equal(settingsForPreset('hearth', { startupPulses: 7.6 }).startupPulses, 8);
});

test('input and startup bursts share the four-impulse frame budget and drain once', () => {
  const draws = [];
  const pair = () => ({ read: { texture: {} }, write: {}, swap() {} });
  const simulation = {
    settings: settingsForPreset(), canvas: { width: 800, height: 600 }, width: 256, height: 192,
    passes: { draw: (...args) => draws.push(args) }, velocity: pair(), matter: pair(), pressure: pair(),
    curlField: { texture: {} }, divergence: { texture: {} },
    splats: [{ x: 0.5, y: 0.5, dx: 0, dy: 0.03, intensity: 1 }],
    pulses: createPulses(8),
  };
  const step = () => {
    draws.length = 0;
    FireSimulation.prototype.step.call(simulation, 1 / 60, 0);
    return draws.filter(([name]) => name === 'splat');
  };
  assert.equal(step().length, 8); // Four velocity and four heat passes.
  assert.equal(simulation.pulses.length, 5);
  assert.equal(step().length, 8);
  assert.equal(step().length, 2);
  assert.equal(step().length, 0);
  FireSimulation.prototype.burst.call(simulation, 12);
  FireSimulation.prototype.burst.call(simulation, 3);
  assert.equal(simulation.pulses.length, 3); // Replace, never accumulate.
  assert.equal(step().length, 6);
  assert.equal(step().length, 0);
});
