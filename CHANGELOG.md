# Changelog

All notable changes to Parametrica are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The version in
`package.json` is authoritative; see
[ADR-0001](./openspec/decisions/0001-code-versioning.md).

## [0.2.24] - 2026-11-09

### Added

- Strict TypeScript for all registered render passes.
- Shared pass context, curve, mesh, style, view, analysis and document
  contracts.
- Typed gradient ramp/range and cached signed-distance raster.

### Changed

- The converted `render/passes/*.js` modules remain compatibility re-exports.
- The pass index imports the `.ts` modules.
- No drawing, pass ordering or preview behavior changed.

## [0.2.23] - 2026-11-09

### Added

- Strict TypeScript for the shared render helpers: renderer contract,
  projection, fill, trace fill, spatial reference and thumbnails.
- Typed palette store and user look store with explicit storage contracts.
- Typed p5-like and SVG context boundaries for render passes.

### Changed

- The converted `render/*.js` modules remain compatibility re-exports.
- Internal imports point at the `.ts` modules.
- No projection, fill, thumbnail or persistence behavior changed.

## [0.2.22] - 2026-11-09

### Added

- Strict TypeScript for the SVG recorder and the Exporter adapter.
- Explicit export port, SVG builder inputs and GIF export options.
- Legacy plain export context normalization.

### Changed

- `export/svgContext.js` and `export/Exporter.js` remain compatibility
  re-exports.
- Architecture checks inspect `Exporter.ts`; the export rule covers both
  extensions.
- No SVG markup, bytes, downloads or report behavior changed.

## [0.2.21] - 2026-11-09

### Added

- Strict TypeScript for the `application/App` controller.
- Structural service and adapter contracts in `application/appPorts.ts`.
- Typed document, evaluation, history, session, notebook, preview and overlay
  state.

### Changed

- `application/App.js` remains a compatibility re-export.
- Architecture checks inspect `App.ts` and the dependency rule covers both
  extensions.
- No controller, session, history or UI behavior changed.

## [0.2.20] - 2026-11-09

### Added

- Strict TypeScript for the ZIP, GIF, binary STL and 3MF export encoders.
- Typed geometry export validation contract and typed GIF frame/options types.
- Local `gifenc` module declaration for the adapter boundary.

### Changed

- `export/zip.js`, `export/gif.js`, `export/stl.js`, `export/3mf.js` and
  `export/geometryExport.js` remain compatibility re-exports.
- No archive layout, byte order, XML, triangulation or unit behavior changed.

## [0.2.19] - 2026-11-09

### Added

- Strict TypeScript for the bounded history, persistence repository, storage
  migration, debounced session store and notebook repositories.
- Typed storage boundary, migration result and session/notebook payloads.

### Changed

- `core/history.js`, `core/persistence.js`, `core/session.js` and
  `lab/notebookRepository.js` remain compatibility re-exports.
- No storage key, migration, timing or payload behavior changed.

## [0.2.18] - 2026-11-09

### Added

- Strict TypeScript for the fabrication source resolver and report builder.
- Typed candidates, grouped recipes, lattice/perforation paths and reports.

### Changed

- `application/fabricationSource.js` remains a compatibility re-export.
- No fabrication selection, report or output behavior changed.

## [0.2.17] - 2026-11-09

### Added

- Strict TypeScript for the application render scene builder.
- Typed evaluation, document, view, preview, groups and layer results.

### Changed

- `application/renderSceneBuilder.js` remains a compatibility re-export.
- No framing, projection, preview or cache behavior changed.

## [0.2.16] - 2026-11-09

### Added

- Strict TypeScript for animation transport, the fabrication job runner and the
  fabrication jobs controller.
- Typed worker messages, progress, reports and runner callbacks.

### Changed

- Old application `.js` paths remain compatibility re-exports.
- No worker timing, animation or report behavior changed.

## [0.2.15] - 2026-11-09

### Added

- Strict TypeScript for ray construction/intersection and surface picking.
- Typed vectors, rays, bounds, transforms, mappings, meshes and pick results.
- Domain layer is now 100% TypeScript.

### Changed

- `interaction/ray` and `interaction/surfacePicker` remain compatibility
  re-exports.
- No picking, inspection or output behavior changed.

## [0.2.14] - 2026-11-09

### Added

- Strict TypeScript for look presets and manufacturing profiles.
- Typed look context/view/user look, manufacturing profiles, checks and
  reports.

### Changed

- `render/lookPresets` and `geometry/manufacturingProfile` remain compatibility
  re-exports.
- No look behavior, report values or output changed.

## [0.2.13] - 2026-11-09

### Added

- Strict TypeScript for the first domain slice: units, overlays, cap
  strategies, scene contracts, pass style and mode helpers.
- Explicit `.ts` imports with `allowImportingTsExtensions`.
- Boundary scanning for `.ts` domain modules.

### Changed

- Old `.js` domain paths remain compatibility re-exports.
- No runtime, render or export behavior changed.

## [0.2.12] - 2026-11-09

### Added

- Form, Look, Keep, Ingest, Advisor and Start With ports.
- Domain look presets, render scene contracts, ray math and surface-picker math.
- Hardened dependency rules: application → render/interaction and UI →
  composition/App are forbidden.

### Changed

- ProductPreview loading is injected by composition.
- `UI_SURFACE` now contains only the Controls surface; every panel uses its own
  port.
- Old render/interaction paths remain compatibility re-exports.
- No panel behavior or export output changed.

## [0.2.11] - 2026-11-09

### Added

- `dependency-cruiser` with domain, core, application, adapter, generator,
  export and cycle rules.
- Empty known-violations baseline and `npm run arch:check`.
- Architecture gate inside `npm run check`.

### Changed

- Pure render-mode helpers moved to `domain/modeToggles.js`; the UI path is a
  compatibility re-export.
- No app behavior or export output changed.

## [0.2.10] - 2026-11-09

### Added

- `PRESET_PORT` and `createPresetPort` for the preset browser and save/delete
  controls.
- `LAB_PORT` and `createLabPort` for Analysis, Explore and Evolution.
- Dynamic boundary checks for every `app.*` use in those panels.

### Changed

- PresetPanel, LabPanel, ExplorePanel and EvolutionPanel receive narrow ports.
- No panel behavior or output changed.

## [0.2.9] - 2026-11-09

### Added

- `RENDER_PORT` and `createRenderPort` for frame, coordinate-pin, thumbnail and
  quad-layout access.
- `NOTEBOOK_PORT` and `createNotebookPort` for the Notebook panel.
- Boundary checks for renderer panels and every NotebookPanel application use.

### Changed

- Timeline, Advisor, Look coordinates and Surface Inspector use the render port.
- NotebookPanel uses the notebook port.
- No panel behavior or output changed.

## [0.2.8] - 2026-11-09

### Added

- `FABRICATION_PORT` and `createFabricationPort` as the first narrow UI port.
- Boundary checks proving the Fabricate panel no longer reads `controls.app`.

### Changed

- `Controls` receives the fabrication port from composition.
- The Fabricate section uses `controls.fabrication`.
- No fabrication behavior or output changed.

## [0.2.7] - 2026-11-09

### Added

- Explicit `UI_SURFACE` and `createUiPort` controller boundary.
- Dynamic architecture check that scans every `app.*` use in `src/ui` against
  the allowed surface.

### Changed

- Composition passes the UI port to `Controls`; panels keep the same API.
- Unknown UI reads or writes now fail instead of silently reaching into App.
- No panel behavior or document output changed.

## [0.2.6] - 2026-11-09

### Added

- Explicit export port for document, evaluation, renderer, fabrication,
  Product preview, notification, time and preset serialization.
- Boundary checks ensuring the exporter never reaches into `App`.

### Changed

- `Exporter` now consumes only the injected port; composition creates it.
- Unit fixtures keep their legacy plain shape through a normalizer.
- No SVG, PNG, GIF, STL, 3MF or JSON output changed.

## [0.2.5] - 2026-11-09

### Added

- `src/composition/createApp.js` as the single browser composition root.
- Service and adapter-factory injection into `App`.
- Boundary checks that keep concrete renderer, UI, exporter and storage
  implementations out of the application class.

### Changed

- `main.js` now boots through `createApp`.
- `App` receives persistence, session, presets, notebook, look store, dialogs,
  mutator, preview services and adapter factories.
- No public behavior or document/export output changed.

## [0.2.4] - 2026-11-09

### Added

- `src/domain/` policy modules for units, overlay ids, pass style, cap
  strategies and manufacturing profiles.
- Executable architecture-boundary tests for domain isolation, document
  imports and generator projection.
- ADR-0004 Phase A slice 1: `core/document.js` no longer imports render, viz or
  geometry; generators use the pure view camera.

### Changed

- Inner modules import domain policy directly.
- `core/units`, `render/passStyle`, `viz/overlays`,
  `geometry/manufacturingProfile` and `geometry/repair` keep compatibility
  re-exports for existing tests and imports.
- No document, geometry, export or UI behavior changed.

## [0.2.3] - 2026-11-09

### Added

- ADR-0004: Clean Architecture target layers, dependency rule, ports and
  composition root.
- ADR-0005: incremental TypeScript migration with `tsconfig`, `tsx`, strict
  domain-first phases and behavior-parity rules.
- ADR-0006: `tsc --noEmit` and dependency-cruiser gates with a shrinking
  baseline.
- Clean Architecture review findings: 186 files, ~41,500 lines and the direct
  outward edges in `document.js`, `engine.js`, `App.js`, `Exporter` and the UI.
- Architecture modernization phases in the roadmap.
- Phase 0 TypeScript foundation: `typescript`, `tsx`, `tsconfig.json`,
  `src/vite-env.d.ts`, `npm run typecheck` and the `tsx` Node test loader.

### Changed

- README and OpenSpec conventions point at the architecture ADRs.
- The working method now names the boundary, type and enforcement sequence.
- `npm run check` includes `tsc --noEmit`; `npm test` runs the existing suites
  through `tsx` so future `.ts` modules import cleanly.

## [0.2.2] - 2026-11-09

### Added

- ADR-0003: spec-driven vertical delivery workflow.
- README, OpenSpec config and roadmap now point at the delivery policy.

### Changed

- The current working method is explicit: one vertical slice per OpenSpec
  change, validate before coding, test before archive, gates before release.

## [0.2.1] - 2026-11-09

### Added

- `PRODUCT.md` with confirmed users, purpose, positioning, constraints, brand
  commitments, evidence and product principles.
- `DESIGN.md` with the Swiss Instrument visual system: carbon palette, signal
  red, functional typography, flat elevation, zero-radius shapes and component
  rules.
- `.impeccable/design.json` sidecar for live component previews.
- ADR-0002: all UI/UX decisions pass through the Impeccable skill, with
  `PRODUCT.md` and `DESIGN.md` as durable authority.

### Changed

- Design work is now a gated process: context, scoped command, craft floor,
  rendered verification and detector.
- README and OpenSpec conventions point at the product/design authority.

## [0.2.0] - 2026-11-09

First tagged release after the v0.1.0 rewrite. This version covers the
post-lattice slices, the consolidated persistence layer, image even-odd fill,
Quad SVG/plotter export, preview evidence, UI hardening, the Fabricate object
library and the GitHub Pages deployment.

### Added

- Shared persistence repository with idempotent legacy-preset migration,
  backups, quota reporting and independent session/notebook/preset stores.
- Image even-odd fill and contour nesting for canvas, SVG and PNG.
- Quad layout export to SVG and plotter with four stable panels.
- Product preview quality degradation, hardware/SSAO benchmarks and Product
  PNG export.
- Dense-surface benchmark and overlay degradation during slow playback.
- UI hardening for 200% zoom, narrow viewports, keyboard navigation, focus,
  reduced motion and an accessibility-tree pass.
- Fabricate object primitives: rounded superellipse shells, cutter layers,
  open annular shells and stepped solids.
- Fabricate object waves: Pencil Cup, Planter, Bud Vase, Napkin Ring, Coaster,
  Twisted Totem, Lampshade, Candle Holder, Soap Dish, Desk Tray, Napkin Holder,
  Wall Planter, Wall Hook, Lampshade Ring Set and Stackable Tray.
- Independent boolean groups for multi-body presets and grouped 3MF output.
- GitHub Pages deployment workflow, live demo and deployment documentation.
- ADR-0001, this changelog and a version-consistency gate.
- Dynamic application version displayed in the masthead.

### Changed

- Fabricate is now a curated library of 24 exportable objects and technical
  solids. SDF Enneper and Möbius Challenge were removed from the category.
- CI runs the complete `npm run check` gate before Playwright.
- Product preview is available for every prepared solid, not only lattice and
  perforated bodies.
- The Fabricate report exposes grouped recipes, manufacturing checks and
  printability evidence.

### Fixed

- Product preview no longer shows “Build the solid preview” for ordinary solid
  presets.
- Storage quota failures keep the in-memory document, checkpoint or preset
  usable and surface the error.
- Corrupt storage data is preserved and backed up instead of being deleted.
- Cutter layers no longer render as authored geometry or appear in SVG.

## [0.1.0] - 2026-10-23

Initial Parametrica rewrite: parametric document model, generators, operators,
analysis, render passes, animation, mutation, presets, notebook, exploration,
image tracing, evolution, Helix Lab, Timeline export and the local-first
instrument UI.
