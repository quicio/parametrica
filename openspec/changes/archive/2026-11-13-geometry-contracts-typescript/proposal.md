## Why

Geometry contracts are the shared vocabulary of the whole app. Typing the
discriminated kinds and the small world-space helpers unblocks every remaining
geometry kernel.

## What Changes

- Convert `geometry/contracts.js` to `.ts` with exported geometry types.
- Convert `geometry/trust.js`, `relations.js`, `transform.js` and
  `transformGeometry.js` to `.ts`.
- Keep JS compatibility re-exports.
- Update engine and surface-lattice call sites for the new contracts.

## Out of Scope

- Validation, repair, CSG, tessellation and lattice kernels.
