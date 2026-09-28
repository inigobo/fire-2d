# Working instructions for coding assistants

The user intends to write an independent simulator with AI assistance. Read `README.md` and `docs/` before implementing.

- Help explain equations and design tradeoffs. Implement small milestones that the user can inspect and tune.
- Do not copy code or shaders from the referenced repositories, including Pavel's MIT implementation or haxiomic's GPL-3.0 implementation. The current repository contains no third-party source.
- If the user later explicitly chooses to reuse code, check its specific license, preserve required notices, and update `docs/PROVENANCE.md` before presenting the work as complete.
- Keep mathematical references and implementation provenance explicit. Avoid claiming independent authorship for copied or closely paraphrased code.
- Prefer a framework-agnostic renderer with a clear lifecycle. The Akelarre React/Next.js integration belongs in `akeweb`, not in the simulation core.
- Preserve working static and reduced-motion fallbacks and verify desktop and mobile behaviour when graphics code changes.
