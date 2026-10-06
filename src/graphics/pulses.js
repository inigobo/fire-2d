/** Scatter heat across shuffled grid cells, with upward, slightly sideways momentum. */
export function createPulses(count, random = Math.random) {
  if (!Number.isFinite(count)) throw new TypeError('Pulse count must be finite');
  const total = Math.round(Math.max(0, Math.min(24, count)));
  if (!total) return [];
  const columns = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / columns);
  const cells = Array.from({ length: columns * rows }, (_, index) => index);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, total).map(cell => ({
    x: 0.08 + 0.84 * ((cell % columns + 0.2 + random() * 0.6) / columns),
    y: 0.10 + 0.70 * ((Math.floor(cell / columns) + 0.2 + random() * 0.6) / rows),
    dx: (random() - 0.5) * 0.10,
    dy: 0.03 + random() * 0.04,
    intensity: 1.6 + random() * 0.8,
    radius: 0.045 + random() * 0.025,
  }));
}

/** One moving brush follows two gentle waves across the middle of the field. */
export function serpentinePulse(progress) {
  const t = Math.max(0, Math.min(1, progress));
  const phase = t * Math.PI * 4;
  return {
    x: 0.06 + 0.88 * t, y: 0.5 + 0.1 * Math.sin(phase),
    dx: 0.04, dy: 0.06 * Math.cos(phase), intensity: 3.5, radius: 0.055,
  };
}

/** A curved route has exact endpoints and a tapered sideways oscillation. */
export function swirlPulse(path, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const vx = path.end.x - path.start.x, vy = path.end.y - path.start.y;
  const distance = Math.hypot(vx, vy);
  const nx = -vy / distance, ny = vx / distance;
  const phase = t * Math.PI * 2 * path.cycles + path.phase;
  const offset = path.amplitude * Math.sin(Math.PI * t) * Math.sin(phase);
  const derivative = path.amplitude * (Math.PI * Math.cos(Math.PI * t) * Math.sin(phase) +
    Math.sin(Math.PI * t) * Math.PI * 2 * path.cycles * Math.cos(phase));
  const tx = vx + nx * derivative, ty = vy + ny * derivative;
  const speed = Math.hypot(tx, ty);
  return {
    x: path.start.x + vx * t + nx * offset,
    y: path.start.y + vy * t + ny * offset,
    dx: tx / speed * 0.055, dy: ty / speed * 0.055,
    intensity: path.intensity, radius: path.radius,
  };
}

function createSwirls(count, random) {
  return Array.from({ length: count }, (_, index) => {
    const start = { x: 0.12 + 0.76 * ((index + 0.2 + random() * 0.6) / count), y: 0.25 + random() * 0.5 };
    const end = { x: 0.18 + random() * 0.64, y: 0.25 + random() * 0.5 };
    if (Math.hypot(end.x - start.x, end.y - start.y) < 0.32) end.x = start.x < 0.5 ? 0.86 : 0.14;
    const path = {
      start, end, amplitude: 0.04 + random() * 0.04,
      cycles: 0.7 + random() * 0.8, phase: random() * Math.PI * 2,
      delay: (count > 1 ? index / (count - 1) * 0.18 : 0) + random() * 0.02,
      length: 0.7 + random() * 0.1,
      intensity: 3 + random() * 0.8, radius: 0.04 + random() * 0.015,
    };
    return { ...swirlPulse(path, 0), path };
  });
}

/** One finite opening sequence. Defaults preserve the original one-shot burst. */
export function createPulseBurst(count, duration = 0, strength = 1, random = Math.random, pattern = 'scatter') {
  if (!Number.isFinite(duration) || !Number.isFinite(strength)) throw new TypeError('Pulse duration and strength must be finite');
  if (!Number.isFinite(count)) throw new TypeError('Pulse count must be finite');
  if (!['scatter', 'serpentine', 'swirls'].includes(pattern)) throw new TypeError('Unknown startup pattern');
  const total = Math.round(Math.max(0, Math.min(24, count)));
  const pulses = pattern === 'serpentine'
    ? total ? [serpentinePulse(0)] : []
    : pattern === 'swirls' ? createSwirls(total, random) : createPulses(count, random);
  return {
    pulses, pattern, duration: Math.max(0, Math.min(20, duration)), strength: Math.max(0, Math.min(4, strength)),
    elapsed: 0, cursor: 0, lastEmission: pulses.map(() => 0), initialized: pulses.map(() => false),
  };
}

const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

/** Progress only in simulation time; pointer input keeps priority within the budget. */
export function takePulseImpulses(burst, dt, budget) {
  if (!burst.pulses.length) return [];
  const count = Math.max(0, Math.min(4, Math.floor(budget)));
  if (!burst.duration) {
    return burst.pulses.splice(0, count).map(pulse => ({ ...pulse, dx: pulse.dx * burst.strength, dy: pulse.dy * burst.strength, intensity: pulse.intensity * burst.strength }));
  }
  burst.elapsed = Math.min(burst.duration, burst.elapsed + Math.max(0, dt));
  if (burst.elapsed >= burst.duration) {
    burst.pulses.length = 0;
    return [];
  }
  const envelope = smooth(burst.elapsed / Math.min(0.4, burst.duration / 4)) *
    smooth((burst.duration - burst.elapsed) / (burst.duration / 4));
  const impulses = [];
  for (let i = 0; i < Math.min(count, burst.pulses.length); i++) {
    const index = burst.cursor++ % burst.pulses.length;
    let pulse = burst.pattern === 'serpentine' ? serpentinePulse(burst.elapsed / burst.duration) : burst.pulses[index];
    let localTime = burst.elapsed;
    let localEnvelope = envelope;
    if (burst.pattern === 'swirls') {
      const path = pulse.path;
      localTime -= burst.duration * path.delay;
      const duration = burst.duration * path.length;
      if (localTime <= 0 || localTime >= duration) {
        burst.lastEmission[index] = burst.elapsed;
        continue;
      }
      pulse = swirlPulse(path, localTime / duration);
      localEnvelope = smooth(localTime / Math.min(0.2, duration / 4)) * smooth((duration - localTime) / (duration / 4));
    }
    // Cap debt after pointer-heavy frames: never release an accumulated heat spike.
    const elapsed = Math.min(0.1, burst.elapsed - burst.lastEmission[index]);
    const kick = !burst.initialized[index] && localTime < 0.5 ? 0.6 : 0;
    const gain = burst.strength * (kick + elapsed * localEnvelope);
    burst.lastEmission[index] = burst.elapsed;
    burst.initialized[index] = true;
    impulses.push({ ...pulse, dx: pulse.dx * gain, dy: pulse.dy * gain, intensity: pulse.intensity * gain });
  }
  return impulses;
}
