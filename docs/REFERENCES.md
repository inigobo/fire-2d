# Research references

These are learning resources and visual references, not a declaration that their source code is part of this repository. Verify the license of any particular file and its dependencies before copying it.

## Foundational algorithms

| Source | Why it matters |
| --- | --- |
| [Jos Stam, *Stable Fluids*](https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf) | The classic stable, interactive fluid approach. Read for the conceptual update loop and semi-Lagrangian advection. |
| [NVIDIA GPU Gems, Chapter 38: Fast Fluid Dynamics Simulation on the GPU](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu) | GPU implementation of advection, forces, divergence, pressure projection, and dye. |
| [Andrew Chan, *Simulating Fluids, Fire, and Smoke in Real-Time*](https://andrewkchan.dev/posts/fire.html) | A readable bridge from 2D fluid math to vorticity, fuel, temperature, buoyancy, and fire rendering, with browser demos. Article and code have separate usage considerations; do not paste its code without checking permission. |

## Existing interactive work

| Project | Technique and lesson | Source license at review time |
| --- | --- | --- |
| [Pavel Dobryakov, WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) ([demo](https://paveldogreat.github.io/WebGL-Fluid-Simulation/)) | Visual benchmark for pointer splats, curling dye, fading, and bloom. Study behaviour and architecture; implement our own source. | MIT |
| [jamportz/Trinity](https://github.com/jamportz/Trinity) | 3D hot fluid with advected temperature, buoyancy, emission, and volume rendering. Useful fire model, much heavier than our 2D target. | MIT |
| [SmokeGL / Candela](https://github.com/LucaAngioloni/SmokeGL) ([demo](https://lucaangioloni.github.io/SmokeGL/)) | Particle-based candle flame and smoke. Useful motion and appearance reference; distinct architecture. | MIT |
| [neungkl/fire-simulation](https://github.com/neungkl/fire-simulation) ([demo](https://neungkl.github.io/fire-simulation/)) | Volumetric flame balls, noise, sparks, and colour. Useful visual reference, not the planned solver. | MIT |
| [haxiomic/GPU-Fluid-Experiments](https://github.com/haxiomic/GPU-Fluid-Experiments) | Earlier cross-platform GPU fluid work referenced by Pavel. Read for high-level comparison only. Its source is GPL-3.0, not MIT; do not import code into this project under the present MIT plan. | GPL-3.0 |
| [diluuuu10/fire3d-3](https://github.com/diluuuu10/fire3d-3) | WebGPU volumetric fuel, heat, soot, buoyancy, and raymarching. Research reference for a full fire model. No repository license was found at review time; do not reuse code without permission. | No license found |

## Visual target

[Shivam Sinha's homepage](https://www.helloshivam.com/) is a reference for the luminous fluid interaction: a concentrated splat responds to the pointer, trails curl and stretch, and colour slowly dissipates. We want a distinct fire-led treatment with a stable idle state and Akelarre-specific art direction in the host site.

## Research questions

1. Does a temperature field plus buoyancy produce convincing rising fire without a fuel field?
2. Should the pointer inject heat and dye continuously, or only when moving above a threshold?
3. How much vorticity and bloom survive lower mobile resolution without becoming muddy?
4. Should a low-frequency distortion pass convey background heat, or does it interfere with text legibility?
5. Can the simulation pause completely outside the viewport and resume without a visible jump?
