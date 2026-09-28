# Fire 2D

An experimental, browser-based fire and fluid renderer. The first target is an interactive website hero: fluid motion that responds to the pointer, with a persistent rising flame, glow, and a quiet static fallback. The project is deliberately generic; Akelarre's website is the first planned integration.

**Status:** research and design. No simulator implementation has been written yet.

## Intent

- Write the simulation and rendering code ourselves, with AI assistance, from published algorithms and documented techniques.
- Preserve the satisfying curls and pointer response of interactive fluid demos while giving the effect heat, upward motion, flame structure, and a restrained glow.
- Expose a small renderer API for embedding in a React/Next.js hero. Keep the simulation independent of React.
- Make desktop, touch, reduced-motion, and non-WebGL experiences intentional.
- Describe the sources and our own contributions accurately. See [provenance](docs/PROVENANCE.md).

## Start here

1. [Research references](docs/REFERENCES.md) — sources, licenses, and what to learn from each.
2. [Simulation design](docs/SIMULATION.md) — fields, update loop, fire model, and rendering direction.
3. [Milestones](docs/ROADMAP.md) — small, reviewable steps from fluid to fire to integration.
4. [Provenance policy](docs/PROVENANCE.md) — how to study existing work without copying implementations.

## Proposed scope

A 2D GPU grid with velocity, dye/emission, and temperature fields. Heat and a controllable emitter create rising movement; a pointer injects force and heat. Vorticity restores small curls. A display pass maps temperature and intensity into a fire palette and glow. A fuel/combustion model is a later experiment, not a prerequisite for the first visually convincing result.

The implementation should be evaluated in a standalone playground before it is integrated into the Akelarre hero. The existing site story is [akeweb#38](https://github.com/inigobo/akeweb/issues/38).

## License

Original material in this repository is MIT licensed; see [LICENSE](LICENSE). This does not relicense code from referenced projects. Any third-party code later incorporated must retain its own required notices and be documented in [provenance](docs/PROVENANCE.md).
