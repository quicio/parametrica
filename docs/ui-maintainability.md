# UI and render module ownership

The inspector and p5 backend are split by responsibility while keeping the
public behavior and commands unchanged.

## Inspector sections

`src/ui/Controls.js` is the coordinator. It owns modes, section ordering,
accordion/UI state, status refresh and shared helpers. Section implementations
live in `src/ui/sections/`:

- `formSections.js` — layers, instances, generator, parameters, equations,
  harmonics and operators.
- `lookSections.js` — Looks, camera, canvas, coordinates and scale.
- `fabricateSections.js` — fabrication settings.
- `keepSections.js` — style, render, overlays, image, animation, timeline,
  mutation, analysis, notebook, advisor, explore, evolution, presets and export.

Section modules receive the coordinator and may call shared helpers, registries
and App APIs. They must not import another section module.

## P5 overlays

`src/render/p5/P5Adapter.js` owns the frame lifecycle, canvas sizing,
capture/export and the surface inspector readout. Overlay drawing lives in
`src/render/p5/overlays.js`:

- Quad layout rendering.
- Coordinate ticks, cursor readout and pinned readout.
- Spatial reference and ground.
- Seam and inspection overlays.
- Guides and image underlay.

The adapter passes explicit frame context into these functions and keeps no
overlay math of its own.

## Tests

`npm test` runs the core suite (`test/lab.smoke.mjs`) plus domain modules in
`test/domains/`. Domain modules export `run(assert)` and cover viewport
coordinates, user Looks and pass appearance, surface seams, and import
boundaries. `npm run test:e2e` remains the browser gate.
