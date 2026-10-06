import test from 'node:test';
import assert from 'node:assert/strict';
import { FIRE_PRESETS, settingsForPreset, mergeSettings } from '../src/config.js';
import { FireSimulation } from '../src/graphics/fire-simulation.js';

function passesFor(overrides = {}) {
  const draws = [];
  const pair = () => ({ read: { texture: {} }, write: {}, swap() {} });
  const simulation = {
    settings: settingsForPreset('hearth', overrides),
    canvas: { width: 800, height: 600 }, width: 256, height: 192,
    passes: { draw: (name, target, values) => draws.push({ name, target, values }) },
    velocity: pair(), matter: pair(), pressure: pair(), curlField: { texture: {} }, divergence: { texture: {} },
    splats: [], pulses: [],
  };
  FireSimulation.prototype.step.call(simulation, 1 / 60, 2);
  return draws;
}

test('new settings retain former preset loss rates and validate partial updates', () => {
  for (const preset of Object.values(FIRE_PRESETS)) {
    assert.equal(preset.cooling, 40);
    assert.equal(preset.damping, 10);
  }
  const current = settingsForPreset();
  const next = mergeSettings(current, { cooling: -1, damping: 120 });
  assert.equal(next.cooling, 0);
  assert.equal(next.damping, 100);
  assert.equal(current.cooling, 40);
  assert.throws(() => mergeSettings(current, { cooling: NaN }), TypeError);
  assert.throws(() => mergeSettings(current, { damping: Infinity }), TypeError);
});

test('cooling and damping control different existing passes without changing density decay or pass count', () => {
  const baseline = passesFor();
  const tuned = passesFor({ cooling: 12, damping: 30 });
  const [velocity, matter] = tuned.filter(pass => pass.name === 'advect');
  const [oldVelocity, oldMatter] = baseline.filter(pass => pass.name === 'advect');
  assert.equal(oldVelocity.values.uDecayX, 0.3);
  assert.equal(oldMatter.values.uDecayX, 1.2);
  assert.ok(Math.abs(velocity.values.uDecayX - 0.9) < 1e-10);
  assert.equal(velocity.values.uDecayY, velocity.values.uDecayX);
  assert.equal(matter.values.uDecayX, 0.36);
  assert.equal(matter.values.uDecayY, oldMatter.values.uDecayY);
  assert.equal(tuned.length, baseline.length);
});

test('emitter power reaches emission, force and display passes, including exact zero', () => {
  for (const power of [0, 0.5, 1, 3]) {
    const draws = passesFor({ emitter: { power } });
    assert.equal(draws.find(pass => pass.name === 'source').values.uIntensity, power);
    assert.equal(draws.find(pass => pass.name === 'force').values.uEmitterPower, power);
    assert.equal(draws.find(pass => pass.name === 'display').values.uEmitterPower, power);
  }
});
