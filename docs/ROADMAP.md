# Milestones

Each milestone should leave a working demo and a short note on what was learned. Keep the renderer independent of the Akelarre application until the visual behaviour is proven.

## 0. Baseline and measurements

- Set up a small TypeScript + WebGL playground with resize, context-loss handling, and a visible static fallback.
- Record a desktop and mobile baseline and define an in-browser parameter panel for development only.
- Keep mathematical references and source provenance in the repository.

## 1. Interactive dye fluid

- Implement advection, divergence, pressure iteration, projection, and pointer splats independently from the references.
- Add curl/vorticity only after the basic solver is stable.
- Compare motion with Pavel's demo, documenting differences without copying its code.

## 2. Rising heat

- Add a temperature field, narrow emitter, buoyancy, cooling, and idle motion.
- Compare at least two looks: a sustained base flame and a sparse trail activated by movement.
- Tune the composition with sufficient negative space for hero text.

## 3. Light and flame language

- Add a heat/intensity colour ramp, restrained bloom, and optional heat distortion.
- Test whether a fuel/combustion field adds useful visual behaviour. Do not add it merely for simulation complexity.
- Capture short desktop and mobile recordings and explain the design decisions.

## 4. Embeddable renderer

- Provide a small lifecycle API and documented parameters. Remove research-only controls from the production build.
- Implement reduced-motion, unsupported-WebGL, offscreen, and low-power behaviour.
- Package or pin a version that the Akelarre site can consume; retain a standalone demo for the portfolio.

## 5. Akelarre integration

- Replace the current particle field in `akeweb` under [issue #38](https://github.com/inigobo/akeweb/issues/38).
- Art-direct the colour, photographic layering, and type contrast for the actual hero in Basque and Spanish.
- Verify touch scrolling, desktop pointer behaviour, readability, and mobile performance.
