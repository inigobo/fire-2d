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

/** One finite opening sequence. Defaults preserve the original one-shot burst. */
export function createPulseBurst(count, duration = 0, strength = 1, random = Math.random, pattern = 'scatter') {
  if (!Number.isFinite(duration) || !Number.isFinite(strength)) throw new TypeError('Pulse duration and strength must be finite');
  if (!Number.isFinite(count)) throw new TypeError('Pulse count must be finite');
  if (!['scatter', 'serpentine'].includes(pattern)) throw new TypeError('Unknown startup pattern');
  const pulses = pattern === 'serpentine'
    ? Math.round(Math.max(0, Math.min(24, count))) ? [serpentinePulse(0)] : []
    : createPulses(count, random);
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
    const pulse = burst.pattern === 'serpentine' ? serpentinePulse(burst.elapsed / burst.duration) : burst.pulses[index];
    // Cap debt after pointer-heavy frames: never release an accumulated heat spike.
    const elapsed = Math.min(0.1, burst.elapsed - burst.lastEmission[index]);
    const kick = !burst.initialized[index] && burst.elapsed < 0.5 ? 0.6 : 0;
    const gain = burst.strength * (kick + elapsed * envelope);
    burst.lastEmission[index] = burst.elapsed;
    burst.initialized[index] = true;
    impulses.push({ ...pulse, dx: pulse.dx * gain, dy: pulse.dy * gain, intensity: pulse.intensity * gain });
  }
  return impulses;
}
