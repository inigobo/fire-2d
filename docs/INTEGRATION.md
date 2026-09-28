# Embedding Fire 2D

Install the source package from the public GitHub repository:

```sh
npm install github:inigobo/fire-2d
```

The npm registry has **not** received a release yet. Pin a commit (`github:inigobo/fire-2d#<commit-sha>`) for a stable deployment. npm also records the resolved revision in your lockfile. No runtime dependencies or build step are required inside this package; your website's normal JavaScript bundler resolves its ES modules.

## Plain JavaScript

```html
<div id="flame" style="position:relative; width:100%; height:500px">
  <canvas id="flame-canvas" style="display:block; width:100%; height:100%" aria-hidden="true"></canvas>
</div>
```

```js
import { createFire } from '@inigobo/fire-2d';

const canvas = document.querySelector('#flame-canvas');
let fire;
try {
  fire = createFire(canvas, {
    interactionTarget: document.querySelector('#flame'),
    settings: { rise: 55, curl: 42, glow: 64, trail: 58 },
    autoplay: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
} catch (error) {
  canvas.hidden = true; // Place your own static fallback behind the canvas.
}

// Later: fire?.setSettings({ glow: 35 }); fire?.pause(); fire?.resume();
// When this view is removed: fire?.destroy();
```

The interaction target provides dimensions and receives desktop pointer movement. It can contain other links and controls; the renderer does not capture pointer events or touch scrolling. The canvas only paints pixels. The host owns sizing, layout, text, static fallback, and reduced-motion policy.

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
          autoplay: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        });
      } catch (error) {
        canvas.current.hidden = true;
      }
    });
    return () => { disposed = true; fire?.destroy(); };
  }, []);

  return <div ref={host} className="fire-host">
    <canvas ref={canvas} className="fire-canvas" aria-hidden="true" />
  </div>;
}
```

Give `.fire-host` a nonzero size and position the canvas to fill it. Put a CSS still image/gradient behind the canvas. For richer reduced-motion behaviour, listen to preference changes and call `pause()` or `resume()` as the standalone demo does.

## Controller

`createFire(canvas, options)` returns:

| Method | Purpose |
| --- | --- |
| `setSettings({ rise, curl, glow, trail })` | Update any subset; finite numbers are clamped to 0–100. |
| `pause()` / `resume()` | Stop or restart animation work. |
| `resize()` | Explicit resize if needed; an observer already handles normal element resizing. |
| `destroy()` | Cancel animation, remove listeners/observers, and release GPU resources. Safe to call twice. |

`onStateChange(state, error?)` reports `running`, `paused`, `context-lost`, or `unavailable`. The package recreates GPU resources after a restored graphics context. If initial WebGL2 setup fails, `createFire` throws so the host can display its fallback. Only one live controller should own a canvas at a time.
