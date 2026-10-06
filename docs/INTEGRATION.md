# Embedding Fire 2D

Install the package:

```sh
npm install @inigobo/fire-2d
```

You can alternatively pin a GitHub source revision with `npm install github:inigobo/fire-2d#<commit-sha>`. No runtime dependencies or build step are required inside this package; your website's normal JavaScript bundler resolves its ES modules.

## Plain JavaScript

```html
<div id="flame" style="position:relative; width:100%; height:500px">
  <canvas id="flame-canvas" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none" aria-hidden="true"></canvas>
  <h1 style="position:relative">Your page content</h1>
</div>
```

```js
import { createFire } from '@inigobo/fire-2d';

const canvas = document.querySelector('#flame-canvas');
let fire;
try {
  fire = createFire(canvas, {
    interactionTarget: document.querySelector('#flame'),
    preset: 'hearth',
    settings: { glow: 55, emitter: { x: 0.65, width: 0.08, power: 1.2 } },
    autoplay: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
} catch (error) {
  canvas.hidden = true; // Place your own static fallback behind the canvas.
}

// Later: fire?.setSettings({ glow: 35 }); fire?.setPreset('candle');
// fire?.pause(); fire?.resume();
// When this view is removed: fire?.destroy();
```

The canvas is an absolutely positioned visual layer. Your HTML content sits above it; you do **not** include the playground control box in your website. The interaction target provides dimensions and receives desktop pointer movement and passive touch swipes. Links and controls still work; interactive elements are ignored for touch heat. The renderer never calls `preventDefault` or captures touch scrolling. The host owns sizing, layout, text, static fallback, and reduced-motion policy. A [scrolling example](../examples/scroll.html) shows the renderer inside a longer page.

## Startup pulses

`settings: { startupPulses: 8 }` seeds scattered heat and upward momentum when animation first runs. Set it to `0` for a quiet start. Counts are rounded and clamped to 0–24. Candle defaults to 0, hearth to 8, and bonfire to 12.

Pulses enter the existing heat and velocity fields as Gaussian impulses. They rise, curl, and fade with the solver; they are not an overlay. At most four input/pulse impulses are processed per frame. Paused simulations wait until resumed. Scrolling back into view, changing presets, and resizing do not trigger another burst. A restored WebGL context starts fresh, including startup pulses.

Call `fire.burst()` to replay the configured count or `fire.burst(12)` for a specific count. Changing `startupPulses` updates future bursts without immediately injecting heat. Repeated calls replace the pending burst instead of accumulating work.

`startupDuration` extends a burst into a finite sustained opening (0–20 simulation
seconds; zero keeps the one-shot behavior). `startupStrength` scales only the
opening heat/momentum, not cursor input (0–4, default 1). For example:
`{ startupPulses: 8, startupDuration: 12, startupStrength: 1.6 }`.
Pulse locations are chosen once, with a short attack, a sustained middle and a
smooth final-quarter fade. Heat continues cooling after injection ends. The
sequence advances only while the simulation runs, so it pauses offscreen or
when hidden and continues without replaying on return. It does not repeat.

Sustained pulses share the same four-impulse frame budget with pointer input,
which gets priority. Inputs are scaled by elapsed simulation time, and each
pulse can accumulate at most 100ms of emission debt after busy input frames.
This prevents a deferred flash; repeated `burst()` calls still replace the
pending sequence. Changing duration/strength affects future bursts only.

`startupPattern: 'serpentine'` changes that opening to one moving brush, regardless
of the positive pulse count. Over the configured duration it moves from x=0.06
to x=0.94 with y=0.5 ± 0.1, tracing two sine-wave cycles around the horizontal
midline. Momentum follows the path tangent; previously emitted heat remains in
the normal fluid simulation. It never loops and uses at most one available input
slot per frame. Choose a positive duration for motion; duration zero emits once
at the left-hand start. Pulse count zero still suppresses all startup input.
The default pattern remains `'scatter'`. Pattern changes apply to future bursts.

## Configuration

Start with `preset: 'candle'`, `'hearth'` (default), or `'bonfire'`. `settings` overrides any subset. The exported `FIRE_PRESETS` object lists their values. For example, a narrow flame on the right can use `preset: 'candle'` and `settings: { emitter: { x: 0.75, power: 1.1 }, glow: 50 }`.

| Setting | Range | Effect |
| --- | --- | --- |
| `startupPulses` | 0–24 | Number of random heat impulses on startup and default replay count. |
| `startupDuration` | 0–20 | Duration in simulation seconds; default 0 gives one-shot pulses. |
| `startupStrength` | 0–4 | Heat/momentum strength of bursts only; default 1. |
| `startupPattern` | `'scatter'` / `'serpentine'` | Scattered sources (default) or one left-to-right central wave. |
| `rise`, `curl`, `glow`, `trail` | 0–100 | Lift, swirl, halo, and visible trail persistence. |
| `cooling` | 0–100 | Heat decay rate = value × 0.03 per second. Lower values retain brightness longer; default 40. |
| `damping` | 0–100 | Velocity decay rate = value × 0.03 per second. Higher values slow drift; default 10. This is drag, not viscosity. |
| `emitter.x`, `emitter.y` | 0–1 | Base position from the left and bottom of the canvas. |
| `emitter.width`, `emitter.height` | 0.01–0.4 | Source dimensions relative to canvas height. |
| `emitter.power` | 0–3 | Emission multiplier, also scaling the base jet and emitter haze. At zero there is no residual emitter-centred lift or shimmer. |

Values outside these ranges are clamped. Unknown names and non-finite numbers throw. `setSettings` merges a partial override; `setPreset` replaces all current settings with a named preset. `getSettings()` returns an independent snapshot.

`cooling: 0` disables explicit heat loss and `damping: 0` disables explicit drag;
advection, boundaries and density decay still apply. To let bursts linger without
accelerating through the centre, keep `emitter.power: 0`, reduce `rise` and
`cooling`, increase `trail`, and raise `damping` moderately. For example:
`{ rise: 24, cooling: 12, damping: 30, trail: 88, emitter: { power: 0 } }`.
These values alter the existing passes, with no extra GPU targets or iterations.

## React or Next.js client component

Create the renderer in an effect after the canvas exists. Dynamic import keeps WebGL initialization on the client. Destroy it in the effect cleanup:

```jsx
'use client';
import { useEffect, useRef } from 'react';

export function FireBackground() {
  const host = useRef(null);
  const canvas = useRef(null);

  useEffect(() => {
    let disposed = false;
    let fire;
    import('@inigobo/fire-2d').then(({ createFire }) => {
      if (disposed) return;
      try {
        fire = createFire(canvas.current, {
          interactionTarget: host.current,
          preset: 'hearth',
          settings: { emitter: { x: 0.62, width: 0.08 }, glow: 55 },
          autoplay: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        });
      } catch (error) {
        canvas.current.hidden = true;
      }
    });
    return () => { disposed = true; fire?.destroy(); };
  }, []);

  return <section ref={host} className="fire-host">
    <canvas ref={canvas} className="fire-canvas" aria-hidden="true" />
    <div className="fire-content"><h1>Your hero content</h1></div>
  </section>;
}
```

```css
.fire-host { position: relative; min-height: 80svh; overflow: hidden; background: radial-gradient(#44201a, #100d12 65%); }
.fire-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.fire-content { position: relative; z-index: 1; }
```

The section scrolls with the page. The package stops animation when it is offscreen and resumes when it returns. Give `.fire-host` a nonzero size and put a CSS still image/gradient behind the canvas. For richer reduced-motion behaviour, listen to preference changes and call `pause()` or `resume()` as the standalone demo does. The React component renders **no simulator controls**.

## Controller

`createFire(canvas, options)` returns:

| Method | Purpose |
| --- | --- |
| `setSettings({ rise, curl, glow, trail, cooling, damping, startupPulses, startupDuration, startupStrength, emitter })` | Merge validated settings and emitter fields. |
| `setPreset('candle' \| 'hearth' \| 'bonfire')` | Replace settings with a named look. |
| `getSettings()` | Read a snapshot of the current configuration. |
| `burst(count?)` | Queue random heat and upward momentum pulses. |
| `pause()` / `resume()` | Stop or restart animation work. |
| `resize()` | Explicit resize if needed; an observer already handles normal element resizing. |
| `destroy()` | Cancel animation, remove listeners/observers, and release GPU resources. Safe to call twice. |

`onStateChange(state, error?)` reports `running`, `paused`, `context-lost`, or `unavailable`. The package recreates GPU resources after a restored graphics context. If initial WebGL2 setup fails, `createFire` throws so the host can display its fallback. Only one live controller should own a canvas at a time.
