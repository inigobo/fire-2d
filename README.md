# Fire 2D

A small, interactive fire and fluid experiment for the browser. It uses a low-resolution WebGL2 simulation, then shades the result across a full-screen canvas. Move the pointer to stir it; tune **rise**, **curl**, **glow**, and **trail** in the live controls.

**[Live demo](https://fire-2d-simulator.inniber.chatgpt.site)** · [Simulation notes](docs/SIMULATION.md) · [References](docs/REFERENCES.md) · [Provenance](docs/PROVENANCE.md)

The [scroll test](https://fire-2d-simulator.inniber.chatgpt.site/examples/scroll.html) places the same renderer between page sections. It shows how the canvas scrolls with its section and pauses offscreen. On touch screens, swiping through the flame adds heat while native page scrolling continues.

## Use it on another website

The browser renderer has a small package entry point. Install it without copying source files:

```sh
npm install @inigobo/fire-2d
```

Import `createFire` from `@inigobo/fire-2d`, pass your canvas, choose `candle`, `hearth`, or `bonfire`, set `settings: { startupPulses: 8 }` for a scattered opening burst, and call `destroy()` when the page removes it. Override the preset with settings, including emitter position, size, and power. The demo itself imports the same entry point; its controls are page UI and are not part of the package. See [integration examples](docs/INTEGRATION.md) for plain JavaScript and React/Next.js, settings, fallbacks, and lifecycle details.

The public GitHub source can also be installed with `npm install github:inigobo/fire-2d#<commit-sha>` when a specific source revision is needed. npm records the installed version in your lockfile.

Call `fire.burst()` to replay the opening pulses. Set `startupPulses: 0` for a quiet start. The demo has a pulse-count slider and replay button.

For a much more visible opening, set `startupDuration: 12, startupStrength: 1.6`.
The scattered pulse locations release heat over twelve simulation seconds, taper
over the last quarter, then stop completely. Pointer input remains independent.
Duration defaults to zero, preserving the original single-injection behavior.

Set `startupPattern: 'serpentine'` with a positive `startupDuration` for a single
left-to-right brush that traces two gentle waves across the middle of the canvas.
Any positive `startupPulses` enables that one brush; zero disables the opening.
The default `'scatter'` pattern retains the existing scattered bursts.

For slower, longer-lived pointer-only flames, try
`settings: { emitter: { power: 0 }, rise: 24, cooling: 12, damping: 30, trail: 88 }`.
Turning off emission now also turns off the emitter's base jet and animated heat
haze. Lower cooling retains heat; higher damping slows existing velocity. Damping
is simple drag, not a physical viscosity solver. Defaults retain the earlier
cooling and velocity-decay rates.

## Run locally

Node 20.11+ is sufficient. There are no runtime dependencies and no build step.

```sh
npm run dev
```

Open `http://localhost:5173`. Run `npm run check` for JavaScript syntax checks. The repository includes a GitHub Pages workflow for hosting the same static files. To activate that public URL, the repository owner must enable Pages with **GitHub Actions** as the build source in **Settings → Pages**; the workflow token cannot enable a new Pages site by itself.

Run `npm test` for the input/settings/pass-contract checks. With the dev server
running, `/tests/gpu.html` verifies the actual WebGL shaders: emitter-off rest,
uniform thermal lift, independent heat/velocity decay, and absence of idle
emitter shimmer. It reports a visible pass/fail result; WebGL2 and floating-point
render targets are required for that check.

## How it works

The state is stored in half-float textures: velocity, heat plus visible density, pressure, divergence, and curl. Each animation frame:

1. Backtrace and interpolate velocity; add upward buoyancy and a small wavering force from heat.
2. Estimate curl and apply vorticity confinement; inject local pointer momentum.
3. Compute divergence, iterate the pressure equation 16 times, and subtract its gradient.
4. Backtrace heat and density through the projected velocity; cool, fade, and emit a fresh flame at the base. Pointer movement also leaves a local heated trail.
5. Shade heat from red to amber to pale gold, multiplied by density. Broad nearby samples add a glow, and a faint animated background suggests rising heat.

See [simulation notes](docs/SIMULATION.md) for the equations and implementation limits. The code is divided into [WebGL resources and passes](src/graphics/gl.js), [shader programs](src/graphics/shaders.js), [simulation and lifecycle](src/graphics/fire-simulation.js), and [page controls](src/main.js). This is an expressive heated-dye model, not a combustion or smoke solver.

## Behaviour and performance

The field's longest side is capped at 256 cells on desktop and 176 on narrower screens. The canvas pixel ratio is capped at 1.5 or 1.25. A frame runs a fixed number of small GPU passes and processes at most four pointer events. Animation pauses when the page is hidden or the stage leaves view; elapsed time is capped on resume. Touch scrolling stays native. Reduced-motion visitors see a CSS static composition and can opt into motion. The page also falls back when WebGL2 or float render targets are unavailable.

This is a first visual prototype. Quality and speed still need measurements on real phones and integrated page layouts. The package API is framework independent and can be consumed by React or plain JavaScript.

## Credits and license

Implementation written for this project with AI assistance from the published algorithms in [references](docs/REFERENCES.md). No code or shaders from the referenced repositories are incorporated. [Provenance](docs/PROVENANCE.md) records that boundary. Original repository material is [MIT licensed](LICENSE).
