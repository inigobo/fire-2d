import { createContext, createTarget, destroyTarget, Passes } from '../src/graphics/gl.js';
import { shaders } from '../src/graphics/shaders.js';

// Real shader checks in a browser: npm run dev, then open /tests/gpu.html.
const result = document.querySelector('#result');
let gl, passes;
const targets = [];
function check(condition, message) { if (!condition) throw new Error(message); }
function near(actual, expected) { return Math.abs(actual - expected) < 0.002; }
try {
  gl = createContext(document.querySelector('canvas'));
  passes = new Passes(gl, shaders);
  const target = () => { const value = createTarget(gl, 32, 32); targets.push(value); return value; };
  const velocity = target(), matter = target(), output = target();
  function fill(field, x, y) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, field.framebuffer);
    gl.clearColor(x, y, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  function read() {
    const pixels = new Float32Array(32 * 32 * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, output.framebuffer);
    gl.readPixels(0, 0, 32, 32, gl.RGBA, gl.FLOAT, pixels);
    check(gl.getError() === gl.NO_ERROR, 'Framebuffer read failed');
    return pixels;
  }
  const channel = (pixels, offset) => pixels.filter((_, i) => i % 4 === offset);
  const range = values => Math.max(...values) - Math.min(...values);
  const force = (power, center = [0.5, 0.5]) => {
    passes.draw('force', output, { uDt: 1 / 60, uRise: 0.24, uTime: 2, uEmitterPower: power, uEmitterCenter: center, uEmitterRadius: [0.2, 0.2] }, { uVelocity: velocity.texture, uMatter: matter.texture });
    return channel(read(), 1);
  };
  fill(velocity, 0, 0);
  fill(matter, 0, 0);
  check(force(0).every(value => value === 0), 'Emitter-off still accelerates empty fluid');
  check(range(force(1)) > 0.002, 'Enabled base jet stopped working');
  fill(matter, 1, 1);
  for (const center of [[0.5, 0.5], [0.2, 0.1]]) {
    const values = force(0, center);
    check(range(values) < 0.00001, 'Emitter-off thermal lift varies with screen position');
    check(values.every(value => near(value, (0.06 + 0.24 * 0.35) / 60)), 'Thermal buoyancy was removed');
  }
  function loss(field, rate, densityRate) {
    passes.draw('advect', output, { uDt: 1, uDecayX: rate, uDecayY: densityRate }, { uField: field.texture, uVelocity: velocity.texture });
    return read();
  }
  const fast = loss(matter, 1.2, 0.592), slow = loss(matter, 0.36, 0.592);
  check(near(fast[0], Math.exp(-1.2)) && near(slow[0], Math.exp(-0.36)), 'Cooling rate is not applied to heat');
  check(slow[0] > fast[0] * 2 && near(slow[1], fast[1]), 'Cooling changed density instead of extending heat');
  fill(matter, 0.5, 0.5);
  const gentle = loss(matter, 0.3, 0.3), damped = loss(matter, 0.9, 0.9);
  check(near(damped[0], 0.5 * Math.exp(-0.9)) && damped[0] < gentle[0], 'Higher damping does not reduce motion');
  fill(matter, 0, 0);
  let previous;
  for (const time of [0, 2, 5]) {
    passes.draw('display', output, { uGlow: 0.9, uAspect: 1, uTime: time, uEmitterPower: 0, uEmitterCenter: [0.5, 0.1] }, { uMatter: matter.texture });
    const pixels = read();
    check(range(channel(pixels, 0)) < 0.00001, 'Emitter-off display still has a centred halo');
    check(!previous || pixels.every((value, index) => value === previous[index]), 'Emitter-off display still shimmers');
    previous = pixels;
  }
  result.textContent = 'PASS: zero base lift, uniform thermal rise, independent cooling/damping, no emitter-off shimmer';
  result.dataset.status = 'passed';
} catch (error) {
  result.textContent = error.message;
  result.dataset.status = 'failed';
} finally {
  if (gl) targets.forEach(value => destroyTarget(gl, value));
  passes?.destroy();
}
