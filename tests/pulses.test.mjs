import test from 'node:test';
import assert from 'node:assert/strict';
import { createPulses, createPulseBurst, takePulseImpulses, serpentinePulse } from '../src/graphics/pulses.js';
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
    pulseBurst: createPulseBurst(8),
  };
  const step = () => {
    draws.length = 0;
    FireSimulation.prototype.step.call(simulation, 1 / 60, 0);
    return draws.filter(([name]) => name === 'splat');
  };
  assert.equal(step().length, 8); // Four velocity and four heat passes.
  assert.equal(simulation.pulseBurst.pulses.length, 5);
  assert.equal(step().length, 8);
  assert.equal(step().length, 2);
  assert.equal(step().length, 0);
  FireSimulation.prototype.burst.call(simulation, 12);
  FireSimulation.prototype.burst.call(simulation, 3);
  assert.equal(simulation.pulseBurst.pulses.length, 3); // Replace, never accumulate.
  assert.equal(step().length, 6);
  assert.equal(step().length, 0);
});

test('sustained openings remain active for the requested duration and then stop permanently', () => {
  const burst = createPulseBurst(8, 12, 1.6, () => 0.5);
  let earlyEnergy = 0, lateEnergy = 0, calls = 0;
  for (let frame = 0; frame < 12 * 60 + 2; frame++) {
    const impulses = takePulseImpulses(burst, 1 / 60, 4);
    assert.ok(impulses.length <= 4);
    const heat = impulses.reduce((sum, impulse) => sum + impulse.intensity, 0);
    if (frame >= 60 && frame < 120) earlyEnergy += heat;
    if (frame >= 660 && frame < 720) lateEnergy += heat;
    calls += impulses.length;
  }
  assert.ok(calls > 2000);
  assert.ok(earlyEnergy > 10);
  assert.ok(lateEnergy > 0 && lateEnergy < earlyEnergy / 4, 'Ending must taper, not switch off at full strength');
  assert.equal(burst.pulses.length, 0);
  assert.deepEqual(takePulseImpulses(burst, 10, 4), []);
});

test('energy stays stable across frame rates without a pointer-backlog spike', () => {
  const energyAt = fps => {
    const burst = createPulseBurst(8, 12, 1.6, () => 0.5);
    let energy = 0;
    for (let frame = 0; frame < 12 * fps + 2; frame++) energy += takePulseImpulses(burst, 1 / fps, 4).reduce((sum, p) => sum + p.intensity, 0);
    return energy;
  };
  assert.ok(Math.abs(energyAt(30) / energyAt(60) - 1) < 0.02);
  const burst = createPulseBurst(8, 12, 1.6, () => 0.5);
  for (let frame = 0; frame < 360; frame++) assert.deepEqual(takePulseImpulses(burst, 1 / 60, 0), []);
  const impulses = takePulseImpulses(burst, 1 / 60, 4);
  assert.ok(impulses.every(p => p.intensity <= 0.32 + 1e-8));
  for (let frame = 0; frame < 400; frame++) takePulseImpulses(burst, 1 / 60, 0);
  assert.deepEqual(takePulseImpulses(burst, 1 / 60, 4), []);
});

test('pulse settings clamp and zero count/strength create no heat', () => {
  const settings = settingsForPreset('hearth', { startupDuration: 40, startupStrength: 10 });
  assert.equal(settings.startupDuration, 20);
  assert.equal(settings.startupStrength, 4);
  assert.deepEqual(takePulseImpulses(createPulseBurst(0, 12, 2), 1 / 60, 4), []);
  assert.ok(takePulseImpulses(createPulseBurst(8, 12, 0), 1 / 60, 4).every(p => p.intensity === 0 && p.dx === 0 && p.dy === 0));
  assert.throws(() => createPulseBurst(8, Infinity), TypeError);
  assert.throws(() => createPulseBurst(8, 12, NaN), TypeError);
});

test('serpentine opening crosses left to right in the central band with two smooth waves', () => {
  const points = Array.from({ length: 9 }, (_, index) => serpentinePulse(index / 8));
  const expectedY = [0.5, 0.6, 0.5, 0.4, 0.5, 0.6, 0.5, 0.4, 0.5];
  assert.equal(points[0].x, 0.06);
  assert.ok(Math.abs(points.at(-1).x - 0.94) < 1e-10);
  points.forEach((point, index) => {
    assert.ok(Math.abs(point.y - expectedY[index]) < 1e-10);
    assert.ok(point.dx > 0);
    if (index) assert.ok(point.x > points[index - 1].x);
  });
});

test('serpentine emits one moving source, respects input priority, and never loops', () => {
  const random = () => { throw new Error('Serpentine must not depend on randomness'); };
  const burst = createPulseBurst(8, 12, 1.6, random, 'serpentine');
  assert.equal(burst.pulses.length, 1);
  let lastX = 0;
  for (let frame = 0; frame < 720; frame++) {
    const impulses = takePulseImpulses(burst, 1 / 60, frame % 5 ? 4 : 0);
    assert.ok(impulses.length <= 1);
    for (const point of impulses) {
      assert.ok(point.x > lastX);
      assert.ok(point.y >= 0.4 && point.y <= 0.6);
      lastX = point.x;
    }
  }
  assert.ok(lastX > 0.93);
  assert.deepEqual(takePulseImpulses(burst, 1, 4), []);
  assert.deepEqual(takePulseImpulses(createPulseBurst(0, 12, 1, random, 'serpentine'), 1, 4), []);
  assert.equal(settingsForPreset('hearth', { startupPattern: 'serpentine' }).startupPattern, 'serpentine');
  assert.throws(() => settingsForPreset('hearth', { startupPattern: 'unknown' }), TypeError);
});
