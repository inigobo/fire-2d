# Simulation design (working draft)

This is an implementation plan, not a claim of physical accuracy. The first goal is an expressive, efficient 2D effect.

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

1. **Advect velocity and scalar fields.** Semi-Lagrangian advection samples the previous field at the back-traced position: `q_next(x) = q_prev(x - dt * u(x))`, with interpolation and explicit boundary handling.
2. **Inject sources.** A narrow, softly varying emitter near the base adds heat and intensity. Pointer motion adds localized velocity, heat, and intensity. A still pointer should not flood the field.
3. **Apply forces.** Hot cells receive an upward force, approximately `f_y = buoyancy * (T - ambient)`. Add optional low-amplitude wind and vorticity confinement to restore curls lost to numerical smoothing.
4. **Project velocity.** Compute `div(u*)`, solve `∇²p = div(u*) / dt` iteratively, then set `u = u* - dt * ∇p` to reduce divergence.
5. **Cool and dissipate.** Reduce `T` and `D` over time so bright cores become darker, thinner trails and eventually vanish. Clamp values and timestep to avoid unstable spikes after a hidden tab resumes.
6. **Display.** Convert heat and intensity to colour and alpha. Add a restrained bloom pass; consider a separate, subtle heat-distortion layer. Keep all text outside the canvas.

The exact ordering of advection, forces, projection, and source injection will be validated in a minimal prototype against the references. This document intentionally specifies behaviour rather than copying a particular shader or update function.

## Fire experiments

**A. Heated dye (first target).** No chemical model. Emit `T` and `D`; upward buoyancy, curl, cooling, and a temperature-to-colour ramp create a stylized flame. Fast to implement and tune.

**B. Fuel and combustion (optional).** Advect `F`, consume it when sufficiently hot, convert some fuel into heat and visible material, and tune cooling. This can produce self-sustaining shapes but adds fields, passes, and parameters. Adopt only if A cannot achieve the intended look.

## Rendering and interaction

- New, hot material: pale amber or white core. Cooling material: saturated warm red and a faint darker edge. Palette should be configurable by the host.
- Preserve dark negative space around type. Bloom should suggest light without washing out controls.
- Desktop pointer affects a local radius and adds momentum proportional to movement; do not replace the native cursor or block links.
- Touch should not capture scrolling. Prefer autonomous fire on phones unless a contained interaction can be proven comfortable.
- The host controls `start`, `pause`, `resume`, `resize`, and `destroy`, and receives a static fallback when WebGL is unavailable or reduced motion is preferred.

## Performance targets to measure

- Stable interaction on a representative lower-powered phone and desktop browser, assessed with frame time and GPU work rather than an unverified FPS claim.
- Adjustable simulation, dye, and bloom resolutions; capped device pixel ratio.
- No animation work while the hero or document is hidden; no retained listeners, textures, framebuffers, or animation loop after destroy.
- The static fallback, real HTML text, and page navigation work before the renderer loads and when it fails.
