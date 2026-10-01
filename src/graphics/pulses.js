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
