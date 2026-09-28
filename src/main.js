import { FireSimulation } from './graphics/fire-simulation.js';

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
    simulation = new FireSimulation(canvas, stage, setStatus);
    simulation.setEnabled(enabled);
    for (const input of document.querySelectorAll('.controls input')) {
      simulation.setSettings({ [input.id]: Number(input.value) });
    }
    if (!enabled) setStatus('Motion paused — static composition');
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
  simulation?.setEnabled(enabled);
  setStatus(enabled ? 'Move your pointer to stir the flame' : 'Motion paused');
  updateToggle();
});

reducedMotion.addEventListener('change', event => {
  enabled = !event.matches;
  if (enabled && !simulation) start();
  simulation?.setEnabled(enabled);
  updateToggle();
  setStatus(enabled ? 'Move your pointer to stir the flame' : 'Motion paused for reduced motion');
});

canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  simulation?.destroy();
  simulation = undefined;
  canvas.hidden = true;
  setStatus('Graphics context lost — static fire');
});
canvas.addEventListener('webglcontextrestored', () => {
  canvas.hidden = false;
  start();
});

updateToggle();
if (enabled) start();
else setStatus('Static fire — reduced motion');
