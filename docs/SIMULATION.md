# Simulation design

This documents the implemented heated-dye prototype, not a claim of physical accuracy. It follows the semi-Lagrangian and projection ideas in [Stam](REFERENCES.md) and [GPU Gems](REFERENCES.md), with a fire-specific buoyancy model.

## State

Each cell on a low-resolution GPU grid stores:

- **Velocity** `u = (u_x, u_y)`: where the fluid moves.
- **Temperature** `T`: drives upward buoyancy and emission colour.
- **Dye/intensity** `D`: tracks visible flame material and the pointer trail.
- **Pressure** `p` and **divergence**: temporary fields for velocity projection.
- **Fuel** `F` (later experiment): separates a persistent flame/combustion model from a simpler heated-dye effect.

Render at a higher display resolution than the simulation grid; use distinct quality presets for desktop and mobile.

## One simulation step

For timestep `dt`, begin with the velocity field from the previous frame:

1. **Advect velocity.** Semi-Lagrangian advection samples the previous field at the back-traced position: `q_next(x) = q_prev(x - dt * u(x))`, with manual bilinear interpolation and clamped edge sampling.
2. **Apply forces.** Hot cells receive an upward force, approximately `f_y = b T`, plus a gentle localized base lift and low-amplitude wavering. Vorticity confinement uses the normalized gradient of absolute curl, rotated by 90 degrees, to restore curls lost to interpolation. Pointer movement injects a Gaussian momentum impulse; a still pointer does not accumulate force.
3. **Project velocity.** Compute `div(u*)`, solve `∇²p = div(u*) / dt` with 16 Jacobi iterations, then set `u = u* - dt * ∇p`. Horizontal and vertical weights account for different grid dimensions. This is an approximate projection; clamped texture edges are not a complete no-slip boundary condition.
4. **Advect and emit.** Backtrace `T` and `D` through the projected velocity. Exponential decay cools heat and fades density. A time-varying Gaussian emitter adds both fields near the bottom; recent pointer events add a heated trail. Optional startup pulses scatter Gaussian heat and momentum impulses across jittered grid cells, with positive vertical velocity. They use the same projection, advection, and cooling steps; no extra fields or shaders are needed.
5. **Display.** Map heat to a red/amber/gold/white ramp, scale it by density, and composite a restrained multi-sample halo. A subtle animated ambient band evokes background heat. Text remains HTML outside the canvas.

The timestep is capped at 33 ms. The solver targets responsive visual motion rather than an accurate physical flame; pressure convergence and boundary behaviour can be improved in later experiments.

### Cooling, damping and emitter-off behaviour

Heat and velocity use independent exponential losses: `T *= exp(-0.03 * cooling * dt)`
and `u *= exp(-0.03 * damping * dt)`. Defaults 40 and 10 reproduce the former
1.2/s and 0.3/s rates. Visible density still decays at `2 - 1.6 * trail / 100`.
Velocity damping is drag; it does not solve the Laplacian diffusion term of
viscosity. Lower cooling prolongs the bright part of a pulse, while higher trail
prolongs its visible material. Damping reduces travel without speeding up cooling.

The Gaussian base jet is multiplied by emitter power. Previously that force was
unconditional, so setting power to zero stopped emission but retained a central
updraft. At power zero only heat-driven buoyancy, input impulses and vorticity
remain; the display also suppresses the emitter-centred ambient halo/shimmer.

## Fire experiments

**A. Heated dye (first target).** No chemical model. Emit `T` and `D`; upward buoyancy, curl, cooling, and a temperature-to-colour ramp create a stylized flame. Fast to implement and tune.

**B. Fuel and combustion (optional).** Advect `F`, consume it when sufficiently hot, convert some fuel into heat and visible material, and tune cooling. This can produce self-sustaining shapes but adds fields, passes, and parameters. Adopt only if A cannot achieve the intended look.

## Rendering and interaction

- New, hot material: pale amber or white core. Cooling material: saturated warm red and a faint darker edge. Palette should be configurable by the host.
- Preserve dark negative space around type. Bloom should suggest light without washing out controls.
- Desktop pointer affects a local radius and adds momentum proportional to movement; do not replace the native cursor or block links.
- Touch does not capture scrolling. Passive touch events add an initial pulse and spaced heat/momentum splats along a swipe; native scrolling continues. The autonomous emitter continues without input only when its power is nonzero.
- The host controls `start`, `pause`, `resume`, `resize`, and `destroy`, and receives a static fallback when WebGL is unavailable or reduced motion is preferred.

## Performance targets to measure

- Stable interaction on a representative lower-powered phone and desktop browser, assessed with frame time and GPU work rather than an unverified FPS claim.
- Adjustable simulation, dye, and bloom resolutions; capped device pixel ratio.
- No animation work while the hero or document is hidden; no retained listeners, textures, framebuffers, or animation loop after destroy. The [scroll example](../examples/scroll.html) demonstrates entry, exit, and return.
- The static fallback, real HTML text, and page navigation work before the renderer loads and when it fails.
