import { createFire } from './index.js';

const stage = document.querySelector('#stage');
const canvas = document.querySelector('#fire');
const status = document.querySelector('#status');
const toggle = document.querySelector('#motion-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let simulation;
let enabled = !reducedMotion.matches;

function setStatus(message) { status.textContent = message; }
function updateToggle() {
  toggle.innerHTML = enabled ? 'Pause motion <span aria-hidden="true">Ⅱ</span>' : 'Play motion <span aria-hidden="true">▷</span>';
  toggle.setAttribute('aria-pressed', String(!enabled));
}

function start() {
  if (simulation) return;
  try {
    const settings = Object.fromEntries([...document.querySelectorAll('.controls input')]
      .map(input => [input.id, Number(input.value)]));
    simulation = createFire(canvas, {
      interactionTarget: stage,
      settings,
      autoplay: enabled,
      onStateChange(state, error) {
        canvas.hidden = state === 'context-lost' || state === 'unavailable';
        if (state === 'unavailable') console.warn('Fire renderer unavailable:', error);
        setStatus({ running: 'Simulation running', paused: 'Motion paused',
          'context-lost': 'Graphics context lost — static fire', unavailable: 'Static fire — WebGL unavailable' }[state]);
      },
    });
  } catch (error) {
    console.warn('Fire renderer unavailable:', error);
    canvas.hidden = true;
    toggle.hidden = true;
    setStatus('Static fire — WebGL unavailable');
  }
}

for (const input of document.querySelectorAll('.controls input')) {
  input.addEventListener('input', () => {
    document.querySelector(`#${input.id}-value`).value = input.value;
    simulation?.setSettings({ [input.id]: Number(input.value) });
  });
}

toggle.addEventListener('click', () => {
  enabled = !enabled;
  if (enabled && !simulation) start();
  if (enabled) simulation?.resume();
  else simulation?.pause();
  updateToggle();
});

reducedMotion.addEventListener('change', event => {
  enabled = !event.matches;
  if (enabled && !simulation) start();
  if (enabled) simulation?.resume();
  else simulation?.pause();
  updateToggle();
  if (!enabled) setStatus('Motion paused for reduced motion');
});

updateToggle();
if (enabled) start();
else setStatus('Static fire — reduced motion');
