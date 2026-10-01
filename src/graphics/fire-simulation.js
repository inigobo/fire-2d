import { createContext, createPair, createTarget, destroyPair, destroyTarget, Passes } from './gl.js';
import { shaders } from './shaders.js';
import { settingsForPreset } from '../config.js';
import { createPulses } from './pulses.js';

export class FireSimulation {
  constructor(canvas, stage, settings = settingsForPreset(), autoplay = true) {
    this.canvas = canvas;
    this.stage = stage;
    this.gl = createContext(canvas);
    this.passes = new Passes(this.gl, shaders);
    this.settings = settings;
    this.splats = [];
    this.pulses = createPulses(settings.startupPulses);
    this.previousPointer = null;
    this.activeTouch = null;
    this.enabled = autoplay;
    this.inView = true;
    this.frame = 0;
    this.lastTime = 0;
    this.started = performance.now();
    this.resizeObserver = null;
    this.intersectionObserver = null;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onPointerLeave = () => { this.previousPointer = null; };
    this.onVisibility = () => this.schedule();
    this.onResize = () => this.resize();
    try {
      this.resize();
      stage.addEventListener('pointermove', this.onPointerMove, { passive: true });
      stage.addEventListener('touchstart', this.onTouchStart, { passive: true });
      stage.addEventListener('touchmove', this.onTouchMove, { passive: true });
      stage.addEventListener('touchend', this.onTouchEnd, { passive: true });
      stage.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
      stage.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibility);
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(stage);
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.inView = entries[0].isIntersecting;
        this.schedule();
      }, { threshold: 0.01 });
      this.intersectionObserver.observe(stage);
      this.schedule();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  burst(count = this.settings.startupPulses) { this.pulses = createPulses(count); }

  setSettings(settings) { this.settings = settings; }
  setEnabled(value) { this.enabled = value; this.schedule(); }

  resize() {
    const rect = this.stage.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const ratio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.25 : 1.5);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (this.canvas.width === width && this.canvas.height === height && this.velocity) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.releaseTargets();

    const maxSide = window.innerWidth < 800 ? 176 : 256;
    const scale = maxSide / Math.max(rect.width, rect.height);
    this.width = Math.max(64, Math.round(rect.width * scale));
    this.height = Math.max(64, Math.round(rect.height * scale));
    const gl = this.gl;
    this.velocity = createPair(gl, this.width, this.height);
    this.matter = createPair(gl, this.width, this.height);
    this.pressure = createPair(gl, this.width, this.height);
    this.divergence = createTarget(gl, this.width, this.height);
    this.curlField = createTarget(gl, this.width, this.height);
    this.lastTime = 0;
  }

  releaseTargets() {
    const gl = this.gl;
    if (this.velocity) destroyPair(gl, this.velocity);
    if (this.matter) destroyPair(gl, this.matter);
    if (this.pressure) destroyPair(gl, this.pressure);
    if (this.divergence) destroyTarget(gl, this.divergence);
    if (this.curlField) destroyTarget(gl, this.curlField);
    this.velocity = this.matter = this.pressure = this.divergence = this.curlField = null;
  }

  onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    if (!this.enabled) return;
    const rect = this.stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    const current = { x, y };
    const previous = this.previousPointer;
    this.previousPointer = current;
    if (!previous || x < 0 || x > 1 || y < 0 || y > 1) return;
    const dx = x - previous.x;
    const dy = y - previous.y;
    if (Math.hypot(dx * rect.width, dy * rect.height) < 1) return;
    this.addSplat(x, y, dx, dy, 1);
  }

  addSplat(x, y, dx, dy, intensity) {
    this.splats.push({ x, y, dx: Math.max(-0.07, Math.min(0.07, dx)),
      dy: Math.max(-0.07, Math.min(0.07, dy)), intensity });
    if (this.splats.length > 12) this.splats.splice(0, this.splats.length - 12);
  }

  onTouchStart(event) {
    if (!this.enabled || !this.inView || this.activeTouch ||
        event.target?.closest?.('a, button, input, label, select, textarea, [data-fire-ignore]')) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const rect = this.stage.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = 1 - (touch.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    this.activeTouch = { id: touch.identifier, clientX: touch.clientX, clientY: touch.clientY };
    this.addSplat(x, y, 0, 0.05, 1.35);
  }

  onTouchMove(event) {
    const previous = this.activeTouch;
    if (!previous || !this.enabled || !this.inView) return;
    const touch = Array.from(event.changedTouches).find(item => item.identifier === previous.id);
    if (!touch || Math.hypot(touch.clientX - previous.clientX, touch.clientY - previous.clientY) < 18) return;
    const rect = this.stage.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = 1 - (touch.clientY - rect.top) / rect.height;
    this.activeTouch = { id: previous.id, clientX: touch.clientX, clientY: touch.clientY };
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const dx = (touch.clientX - previous.clientX) / rect.width;
    const dy = (previous.clientY - touch.clientY) / rect.height;
    // Keep the heat lifting even when the finger swipes downward. No preventDefault.
    this.addSplat(x, y, dx * 0.5, Math.max(0.02, 0.035 + dy * 0.4), 1.2);
  }

  onTouchEnd(event) {
    if (this.activeTouch && Array.from(event.changedTouches).some(touch => touch.identifier === this.activeTouch.id)) {
      this.activeTouch = null;
    }
  }

  schedule() {
    const active = this.enabled && this.inView && !document.hidden;
    if (!active && this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastTime = 0;
    } else if (active && !this.frame && this.velocity) {
      this.frame = requestAnimationFrame(time => this.tick(time));
    }
  }

  tick(time) {
    this.frame = 0;
    const dt = this.lastTime ? Math.min(0.033, Math.max(0.001, (time - this.lastTime) / 1000)) : 1 / 60;
    this.lastTime = time;
    this.step(dt, (time - this.started) / 1000);
    this.schedule();
  }

  step(dt, time) {
    const passes = this.passes;
    const velocity = this.velocity;
    const matter = this.matter;
    const pressure = this.pressure;
    const texel = [1 / this.width, 1 / this.height];
    const aspect = this.canvas.width / this.canvas.height;
    const s = this.settings;
    const emitter = s.emitter;
    const emitterCenter = [emitter.x, emitter.y];
    const emitterRadius = [emitter.width / aspect, emitter.height];

    passes.draw('advect', velocity.write, { uDt: dt, uDecayX: 0.3, uDecayY: 0.3 },
      { uField: velocity.read.texture, uVelocity: velocity.read.texture });
    velocity.swap();
    passes.draw('force', velocity.write, { uDt: dt, uRise: s.rise / 100, uTime: time,
      uEmitterCenter: emitterCenter, uEmitterRadius: emitterRadius },
      { uVelocity: velocity.read.texture, uMatter: matter.read.texture });
    velocity.swap();

    passes.draw('curl', this.curlField, { uTexel: texel }, { uVelocity: velocity.read.texture });
    passes.draw('vorticity', velocity.write, { uTexel: texel, uDt: dt, uStrength: s.curl / 100 },
      { uVelocity: velocity.read.texture, uCurl: this.curlField.texture });
    velocity.swap();

    // A bounded number of splats keeps fast pointer events from stalling a frame.
    const splats = this.splats.splice(0, 4);
    splats.push(...this.pulses.splice(0, 4 - splats.length));
    for (const splat of splats) {
      passes.draw('splat', velocity.write,
        { uPoint: [splat.x, splat.y], uValue: [splat.dx * 2.4, splat.dy * 2.4], uRadius: splat.radius ?? 0.035, uAspect: aspect },
        { uField: velocity.read.texture });
      velocity.swap();
    }

    passes.draw('divergence', this.divergence, { uTexel: texel }, { uVelocity: velocity.read.texture });
    for (let i = 0; i < 16; i++) {
      passes.draw('pressure', pressure.write, { uTexel: texel, uDt: dt },
        { uPressure: pressure.read.texture, uDivergence: this.divergence.texture });
      pressure.swap();
    }
    passes.draw('project', velocity.write, { uTexel: texel, uDt: dt },
      { uVelocity: velocity.read.texture, uPressure: pressure.read.texture });
    velocity.swap();

    const trailDecay = 2.0 - (s.trail / 100) * 1.6;
    passes.draw('advect', matter.write, { uDt: dt, uDecayX: 1.2, uDecayY: trailDecay },
      { uField: matter.read.texture, uVelocity: velocity.read.texture });
    matter.swap();
    passes.draw('source', matter.write,
      { uDt: dt, uTime: time, uCenter: emitterCenter, uRadius: emitterRadius, uValues: [2.8, 2.0], uIntensity: emitter.power },
      { uField: matter.read.texture });
    matter.swap();

    // The same bounded input batch perturbs motion and leaves a heated trail.
    for (const splat of splats) {
      passes.draw('splat', matter.write,
        { uPoint: [splat.x, splat.y], uValue: [0.48 * splat.intensity, 0.35 * splat.intensity], uRadius: splat.radius ?? 0.032, uAspect: aspect },
        { uField: matter.read.texture });
      matter.swap();
    }

    passes.draw('display', null, { uGlow: s.glow / 80, uAspect: aspect, uTime: time,
      uEmitterCenter: emitterCenter }, { uMatter: matter.read.texture });
  }

  destroy() {
    this.enabled = false;
    this.schedule();
    this.stage.removeEventListener('pointermove', this.onPointerMove);
    this.stage.removeEventListener('touchstart', this.onTouchStart);
    this.stage.removeEventListener('touchmove', this.onTouchMove);
    this.stage.removeEventListener('touchend', this.onTouchEnd);
    this.stage.removeEventListener('touchcancel', this.onTouchEnd);
    this.stage.removeEventListener('pointerleave', this.onPointerLeave);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.releaseTargets();
    this.passes.destroy();
  }
}
