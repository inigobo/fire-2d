# Embedding Fire 2D

Install the source package from the public GitHub repository:

```sh
npm install github:inigobo/fire-2d
```

The npm registry has **not** received a release yet. Pin a commit (`github:inigobo/fire-2d#<commit-sha>`) for a stable deployment. npm also records the resolved revision in your lockfile. No runtime dependencies or build step are required inside this package; your website's normal JavaScript bundler resolves its ES modules.

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

## Configuration

Start with `preset: 'candle'`, `'hearth'` (default), or `'bonfire'`. `settings` overrides any subset. The exported `FIRE_PRESETS` object lists their values. For example, a narrow flame on the right can use `preset: 'candle'` and `settings: { emitter: { x: 0.75, power: 1.1 }, glow: 50 }`.

| Setting | Range | Effect |
| --- | --- | --- |
| `rise`, `curl`, `glow`, `trail` | 0–100 | Lift, swirl, halo, and visible trail persistence. |
| `emitter.x`, `emitter.y` | 0–1 | Base position from the left and bottom of the canvas. |
| `emitter.width`, `emitter.height` | 0.01–0.4 | Source dimensions relative to canvas height. |
| `emitter.power` | 0–3 | Heat and visible density emitted per second. |

Values outside these ranges are clamped. Unknown names and non-finite numbers throw. `setSettings` merges a partial override; `setPreset` replaces all current settings with a named preset. `getSettings()` returns an independent snapshot.

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
| `setSettings({ rise, curl, glow, trail, emitter })` | Merge validated settings and emitter fields. |
| `setPreset('candle' \| 'hearth' \| 'bonfire')` | Replace settings with a named look. |
| `getSettings()` | Read a snapshot of the current configuration. |
| `pause()` / `resume()` | Stop or restart animation work. |
| `resize()` | Explicit resize if needed; an observer already handles normal element resizing. |
| `destroy()` | Cancel animation, remove listeners/observers, and release GPU resources. Safe to call twice. |

`onStateChange(state, error?)` reports `running`, `paused`, `context-lost`, or `unavailable`. The package recreates GPU resources after a restored graphics context. If initial WebGL2 setup fails, `createFire` throws so the host can display its fallback. Only one live controller should own a canvas at a time.
