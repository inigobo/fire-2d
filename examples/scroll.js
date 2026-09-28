import { createFire } from '../src/index.js';

const section = document.querySelector('#flame-section');
const canvas = document.querySelector('#fire');
const status = document.querySelector('#viewport-status');
const toggle = document.querySelector('#motion-toggle');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let enabled = !preference.matches;
let inView = false;
let state = 'running';
let fire;

function update() {
  toggle.textContent = enabled ? 'Pause motion' : 'Play motion';
  toggle.setAttribute('aria-pressed', String(!enabled));
  status.textContent = state === 'unavailable' || state === 'context-lost'
    ? 'Static fallback'
    : !enabled ? 'Motion paused'
      : inView ? 'Flame in view · animating' : 'Flame offscreen · paused';
}

try {
  fire = createFire(canvas, {
    interactionTarget: section,
    autoplay: enabled,
    onStateChange(next, error) {
      state = next;
      canvas.hidden = next === 'unavailable' || next === 'context-lost';
      if (error) console.warn('Fire unavailable:', error);
      update();
    },
  });
} catch (error) {
  state = 'unavailable';
  canvas.hidden = true;
  toggle.hidden = true;
  console.warn('Fire unavailable:', error);
}

const observer = new IntersectionObserver(entries => {
  inView = entries[0].isIntersecting;
  update();
}, { threshold: 0.01 });
observer.observe(section);

toggle.addEventListener('click', () => {
  enabled = !enabled;
  if (enabled) fire?.resume();
  else fire?.pause();
  update();
});

preference.addEventListener('change', event => {
  enabled = !event.matches;
  if (enabled) fire?.resume();
  else fire?.pause();
  update();
});

update();
