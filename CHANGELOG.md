# Changelog

All notable changes to Parametrica are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The version in
`package.json` is authoritative; see
[ADR-0001](./openspec/decisions/0001-code-versioning.md).

## [0.2.59] - 2026-11-13

### Added

- Strict TypeScript for deterministic solid preparation: weld, boundary
  loops, caps, merge and the composed prepare step.
- Typed prep stats, warnings and usable-mesh guards.

### Changed

- `geometry/solidPrep.js` remains a compatibility re-export.
- No weld, cap or merge behavior changed.

## [0.2.58] - 2026-11-13

### Added

- Strict TypeScript for SDF repair, lattice specs, local SDF joints and
  perforation cutters.
- Typed level-set boundaries, lattice contracts and radius profiles.

### Changed

- `geometry/sdfRepair.js`, `latticeSpec.js`, `latticeJointBlend.js` and
  `perforation.js` remain compatibility re-exports.
- No SDF, lattice or perforation behavior changed.

## [0.2.57] - 2026-11-13

### Added

- Strict TypeScript for the legacy Curve bridge.
- Typed Catmull-Rom segments, master spline params/metrics, mirror and optical
  correction.

### Changed

- `geometry/legacy.js` and `geometry/legacy/*.js` remain compatibility
  re-exports.
- No spline, mirror or optical behavior changed.

## [0.2.56] - 2026-11-13

### Added

- Strict TypeScript for world-space analysis and `bbox3`.
- Typed UV domain summaries, surface tessellation/mapping and wireframes.

### Changed

- `geometry/analysis.js`, `uvDomain.js`, `surfaceTessellation.js` and
  `wireframe.js` remain compatibility re-exports.
- No mesh, mapping or wireframe behavior changed.

## [0.2.55] - 2026-11-13

### Added

- Strict TypeScript for curve, surface, mesh and solid validation.
- Typed printability summaries, lattice checks and validation metadata.

### Changed

- `geometry/validate.js` and `printChecks.js` remain compatibility re-exports.
- No validation or printability behavior changed.

## [0.2.54] - 2026-11-13

### Added

- Strict TypeScript for robust orientation/exact predicates, snapping and
  adaptive tolerances.
- Typed triangle classification, BVH nodes and self-intersection pairs.

### Changed

- `geometry/robustPredicates.js` and `selfIntersection.js` remain
  compatibility re-exports.
- No numeric, tolerance or detection behavior changed.

## [0.2.53] - 2026-11-13

### Added

- Strict TypeScript for the canonical geometry contracts and kinds.
- Typed trust metadata, kind conversions, world transforms and generic point
  mapping.

### Changed

- `geometry/contracts.js`, `trust.js`, `relations.js`, `transform.js` and
  `transformGeometry.js` remain compatibility re-exports.
- No geometry shape, transform or trust behavior changed.

## [0.2.52] - 2026-11-12

### Added

- Strict TypeScript for duplicate, radial, linear, polar, grid and recursive
  repeat, plus Voronoi, skeleton and medial axis.
- A local d3-delaunay declaration for triangles, halfedges and cells.

### Changed

- `operators/topology/repeat.js` and `voronoi.js` remain compatibility
  re-exports.
- No array, Voronoi or skeleton behavior changed.

## [0.2.51] - 2026-11-12

### Added

- Strict TypeScript for twist, bend, warp, expression displace, noise
  displace, project, shape clip, expression clip and boolean.
- Typed expression contracts and polygon-clipping ring/result types.

### Changed

- `operators/geometry/deform.js`, `project.js`, `expressionClip.js` and
  `boolean.js` remain compatibility re-exports.
- No deformation, clipping or boolean behavior changed.

## [0.2.50] - 2026-11-12

### Added

- Strict TypeScript for offset, inflate, shrink, symmetrize, kaleidoscope,
  optical correction, stroke expansion, ribbon and centerline.
- Typed vec2/curve shapes and the shared offset/stroke helpers.

### Changed

- `operators/geometry/offset.js`, `symmetry.js` and `stroke.js` remain
  compatibility re-exports.
- No offset, symmetry or outline behavior changed.

## [0.2.49] - 2026-11-12

### Added

- Strict TypeScript for the resample, subdivide and smooth operators.
- Typed curve inputs, params and midpoint/chaikin/laplacian helpers.

### Changed

- `operators/geometry/resample.js` remains a compatibility re-export.
- No sampling, subdivision or smoothing behavior changed.

## [0.2.48] - 2026-11-12

### Added

- Strict TypeScript for translate, mirror, rotate, scale and normalize.
- Typed transform params, points, expression scopes and point counts.

### Changed

- `operators/geometry/transform.js` remains a compatibility re-export.
- No transform behavior changed.

## [0.2.47] - 2026-11-12

### Added

- Strict TypeScript for operator expression helpers and the registration index.
- Typed optional expression compilation, scopes and point evaluation.

### Changed

- `operators/expression.js` and `operators/index.js` remain compatibility
  modules.
- No expression or registration behavior changed.

## [0.2.46] - 2026-11-11

### Added

- Strict TypeScript for the surface lattice generator.
- Typed lattice params, network cells/edges, openings and cache.

### Changed

- `generators/surfaceLattice.js` remains a compatibility re-export.
- The generator index and architecture check read the `.ts` module.
- No lattice geometry or caching behavior changed.

## [0.2.45] - 2026-11-11

### Added

- Strict TypeScript for the Lorenz, Clifford, De Jong and Aizawa attractors.
- Typed attractor params, starts, iteration and projections.

### Changed

- `generators/attractors.js` remains a compatibility re-export.
- The generator index imports the `.ts` module.
- No attractor geometry or sampling behavior changed.

## [0.2.44] - 2026-11-11

### Added

- Strict TypeScript for parametric 3D, helix and parametric surface generators.
- Typed 3D/surface params, domains, seams and projection boundaries.

### Changed

- The three generator `.js` paths remain compatibility re-exports.
- The generator index imports the `.ts` modules.
- No geometry or projection behavior changed.

## [0.2.43] - 2026-11-11

### Added

- Strict TypeScript for trochoid, spirograph and spline generators.
- Typed trochoid turns/points and procedural spline node contracts.

### Changed

- The two generator `.js` paths remain compatibility re-exports.
- The generator index imports the `.ts` modules.
- No geometry or sampling behavior changed.

## [0.2.42] - 2026-11-11

### Added

- Strict TypeScript for polar, custom, Fourier, noise-field,
  concentric-ellipses and bilateral-spline generators.
- Typed parameter interfaces and multi-curve metadata.

### Changed

- These generator `.js` paths remain compatibility re-exports.
- The generator index imports the `.ts` modules.
- No geometry or sampling behavior changed.

## [0.2.41] - 2026-11-11

### Added

- Strict TypeScript for generator context, composition and the classic 2D
  generators.
- Typed generator contexts, composed curves and per-generator params.
- Correct sampling return types for parametric points.

### Changed

- Classic generator `.js` paths remain compatibility re-exports.
- The generator index imports the `.ts` modules.
- No generator output, domains or registry behavior changed.

## [0.2.40] - 2026-11-10

### Added

- Strict TypeScript for the image tracing pipeline.
- Strict TypeScript for `createApp` and the browser entry (`main.ts`).
- Typed image/contour/harmonic and composition-root contracts.

### Changed

- `input/imageTrace.js`, `composition/createApp.js` and `main.js` remain
  compatibility modules.
- `index.html` loads `src/main.ts`.
- No tracing, boot or composition behavior changed.

## [0.2.39] - 2026-11-10

### Added

- Strict TypeScript for all composition ports and shared binding helpers.
- Typed UI Proxy handlers, port records and renderer capture/pin surface.
- Typed UI-only `exploreSeed` state on App.

### Changed

- The converted `composition/create*Port.js` modules remain compatibility
  re-exports.
- Port allow-lists, getters and binding behavior are unchanged.

## [0.2.38] - 2026-11-10

### Added

- Strict TypeScript for the preset catalog, object builders, built-ins and
  manager.
- Typed preset metadata, builder options, built-in factories and preview
  caches.

### Changed

- The converted `presets/*.js` modules remain compatibility re-exports.
- Internal imports point at the `.ts` modules.
- No preset documents, storage keys or preview behavior changed.

## [0.2.37] - 2026-11-10

### Added

- Strict TypeScript for the offline advisor and optional providers.
- Typed path resolution, suggestion results, advisor responses and provider
  contracts.

### Changed

- `ai/offline.js` and `ai/provider.js` remain compatibility re-exports.
- Internal imports point at the `.ts` modules.
- No rules, payloads, cache or fallback behavior changed.

## [0.2.36] - 2026-11-10

### Added

- Strict TypeScript for the notebook, exploration and evolution models.
- Typed checkpoint/project/series, exploration candidate and evolution child
  contracts.

### Changed

- The converted `lab/*.js` modules remain compatibility re-exports.
- Internal imports point at the `.ts` modules.
- No persistence, candidate math or evolution behavior changed.

## [0.2.35] - 2026-11-10

### Added

- Strict TypeScript for the deterministic figure descriptor.
- Typed descriptor inputs, results and analysis helper contracts.

### Changed

- `lab/descriptor.js` remains a compatibility re-export.
- Internal imports point at `descriptor.ts`.
- No descriptor values, hashes, budgets or ordering changed.

## [0.2.34] - 2026-11-10

### Added

- Strict TypeScript for the p5 rendering backend.
- Typed p5 canvas/app/artboard/pointer/pin contracts.
- Minimal local `p5` module declaration.

### Changed

- `render/p5/P5Adapter.js` remains a compatibility re-export.
- Composition loads the `.ts` adapter; maintainability checks read it.
- No drawing, capture, camera or animation behavior changed.

## [0.2.33] - 2026-11-10

### Added

- Strict TypeScript for the optional THREE/WebGL product preview.
- Typed mesh/bounds/scene/app, material/quality and interaction contracts.
- `@types/three` development dependency.

### Changed

- `render/webgl/ProductPreview.js` remains a compatibility re-export.
- Composition loads the `.ts` module.
- No rendering, framing, quality or capture behavior changed.

## [0.2.32] - 2026-11-10

### Added

- Strict TypeScript for the p5 frame-context overlays.
- Typed p5 overlay context/adapter, coordinate options and overlay shapes.
- Typed quad, coordinates, underlay, seam, inspection, reference and guide
  drawing.

### Changed

- `render/p5/overlays.js` remains a compatibility re-export.
- No overlay drawing, layout, clipping or hit-test behavior changed.

## [0.2.31] - 2026-11-10

### Added

- Strict TypeScript for the evaluation engine and its result contract.
- Typed curves, geometry, errors, stats, layer results, options and caches.
- Typed stage, spatial, surface, instance and budget pipelines.

### Changed

- `core/engine.js` remains a compatibility re-export.
- App, mutation and preview boundaries use the typed evaluation.
- Internal imports point at `engine.ts`.
- No evaluation, cache, budget or projection behavior changed.

## [0.2.30] - 2026-11-10

### Added

- Strict TypeScript for deterministic preset previews.
- Typed advisor cache and grounded prompt helpers.
- Typed preview keys/thumbnails, cache keys and prompt payloads.

### Changed

- The converted `presets/preview.js`, `ai/cache.js` and `ai/prompt.js` remain
  compatibility re-exports.
- Internal imports point at the `.ts` modules.
- No preview, cache eviction or prompt payload behavior changed.

## [0.2.29] - 2026-11-10

### Added

- Strict TypeScript for lab parameter refs, notebook workspace, parametric
  summary, document/descriptor diffs, canonical SHA-256 and sensitivity probes.
- Typed lab document, workspace, summary and sensitivity result contracts.

### Changed

- The converted `lab/*.js` modules remain compatibility re-exports.
- Internal imports point at the `.ts` modules.
- No sensitivity, diff, hash, summary or workspace behavior changed.

## [0.2.28] - 2026-11-10

### Added

- Strict TypeScript for the canonical document model and sanitization.
- Shared document/view/layer/style/animation contracts in
  `core/documentTypes.ts`.
- Typed defaults, layer creation/aliases, fabrication settings and v1
  migration.

### Changed

- `core/document.js` remains a compatibility re-export.
- `App` uses the shared document shape instead of a duplicate contract.
- Internal imports and the architecture check read `document.ts`.
- No document shape, default, alias or migration behavior changed.

## [0.2.27] - 2026-11-10

### Added

- Strict TypeScript for the core schema, registry, layer graph, capabilities
  and fill-gradient helpers.
- Typed stage/generator/operator/render-pass definitions and registries.
- Typed schema entries, params, harmonics and layer/source contracts.

### Changed

- The converted `core/*.js` modules remain compatibility re-exports.
- Internal imports point at the `.ts` modules.
- No schema defaults, registry validation, layer rules or gradients changed.

## [0.2.26] - 2026-11-09

### Added

- Strict TypeScript for the world→view→artboard transform and frames.
- Typed curve/mesh projection, orthographic helpers and projected points.
- Typed viewport descriptors, coordinate readouts, ranges, ticks and quad
  panel layout.

### Changed

- The converted `view/*.js` modules remain compatibility re-exports.
- Internal imports and the scene builder use the typed view contracts.
- No framing, projection, coordinate or picking behavior changed.

## [0.2.25] - 2026-11-09

### Added

- Strict TypeScript for camera state/projection and spatial references.
- Typed period math, parametric sampling, intersection and differential
  analysis.
- Typed timeline/animatable resolution, mutation engine and diagnostic
  overlays.

### Changed

- The converted support-helper `.js` modules remain compatibility re-exports.
- Internal imports point at the `.ts` modules.
- Architecture checks read the typed viz overlay module.
- No camera, sampling, analysis, timeline or mutation behavior changed.

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
