# module-boundaries Specification

## Purpose
Split shared helpers by responsibility so registries, geometry and generators remain independently testable.
## Requirements
### Requirement: Responsibility-based helper modules

Shared generator helpers SHALL be split by responsibility.

#### Scenario: Period math

- **WHEN** a generator needs a closing period
- **THEN** it imports from `math/periods.js`
- **AND** does not load sampling, rendering or 3D camera code

#### Scenario: Parametric sampling

- **WHEN** a generator samples a parameter domain
- **THEN** it imports the sampling helper from `sampling/parametric.js`

#### Scenario: 3D camera

- **WHEN** a generator projects 3D points
- **THEN** it imports camera helpers from `render/camera3d.js`

### Requirement: Import direction

The dependency direction SHALL be documented and enforced.

#### Scenario: Core independence

- **WHEN** any runtime module under `src/core` is loaded in Node
- **THEN** it does not import UI widgets, DOM panels or lil-gui
- **AND** no controller file outside the composition root imports UI modules

#### Scenario: UI may depend on core

- **WHEN** a UI widget needs registry or document helpers
- **THEN** it imports from core through public module exports

### Requirement: Import smoke test

The Node suite SHALL load registries and core modules without a DOM.

#### Scenario: Headless import

- **WHEN** the smoke test imports generators, operators and render passes
- **THEN** no module accesses `window`, `document` or `localStorage` at import
  time

### Requirement: UI import boundaries

Inspector section modules SHALL depend on shared UI helpers, registries and App
APIs, not on each other.

#### Scenario: Section import

- **WHEN** one section module is loaded
- **THEN** it does not import another section implementation
- **AND** shared rules live in a common helper

### Requirement: Domain isolation

The domain layer SHALL contain only inner policy and SHALL NOT import adapters,
UI, application or infrastructure modules.

#### Scenario: Domain import

- **WHEN** a module under `src/domain/` is loaded
- **THEN** it does not import `render`, `viz`, `ui`, `application`, `workers`,
  `export` or `geometry`
- **AND** it remains Node-testable without a DOM

### Requirement: Document isolation

Document validation SHALL depend on domain policy, not rendering or fabrication
infrastructure.

#### Scenario: Document imports

- **WHEN** `src/core/document.js` is inspected
- **THEN** it does not import `render/passStyle`, `viz/overlays`,
  `geometry/repair` or `geometry/manufacturingProfile`
- **AND** the same policy is available under `src/domain/`

### Requirement: Generator projection

Generators SHALL use pure view/camera math, not the render adapter.

#### Scenario: Camera import

- **WHEN** a generator needs camera projection
- **THEN** it imports `view/camera.js`
- **AND** it does not import `render/camera3d.js`

### Requirement: Compatibility re-exports

Existing import paths SHALL keep working during the migration.

#### Scenario: Old path

- **WHEN** code imports `core/units`, `viz/overlays`, `render/passStyle` or
  `geometry/manufacturingProfile`
- **THEN** the module still resolves
- **AND** it re-exports the domain implementation

### Requirement: Composition root ownership

The browser composition root SHALL be the only module that selects concrete
adapters and stores.

#### Scenario: Boot

- **WHEN** the browser app starts
- **THEN** `main.js` calls `composition/createApp.js`
- **AND** `createApp` constructs persistence, session, presets, notebook, UI,
  renderer and exporter implementations

#### Scenario: Application purity

- **WHEN** `application/App.ts` is inspected
- **THEN** it does not import `P5Adapter`, `Controls`, `Exporter`, `StartWithOverlay`,
  dialogs, overlays, `PresetManager`, `Notebook`, `SessionStore` or
  `MutationEngine`
- **AND** it receives them as services or adapter factories

### Requirement: Behavior parity

Moving construction to the composition root SHALL NOT change public behavior.

#### Scenario: Existing flows

- **WHEN** the app restores a session, applies a preset, exports, switches to
  Product preview or opens Start With
- **THEN** the behavior is unchanged
- **AND** all Node and Playwright suites pass

### Requirement: Export adapter port

The exporter SHALL depend on an explicit export port, not on the App
composition object.

#### Scenario: Browser export

- **WHEN** SVG, PNG, GIF, STL, 3MF or JSON is exported
- **THEN** the exporter reads document, evaluation, renderer and fabrication
  state through the injected port
- **AND** composition supplies the port

#### Scenario: Tests

- **WHEN** a unit fixture provides the legacy plain context
- **THEN** the exporter normalizes it to the port shape
- **AND** output remains identical

### Requirement: UI controller port

The UI SHALL receive an explicit controller surface instead of the concrete App
object.

#### Scenario: Panel access

- **WHEN** a panel reads or writes `controls.app.<name>`
- **THEN** `<name>` is listed in `UI_SURFACE`
- **AND** unknown names throw

#### Scenario: Composition

- **WHEN** the browser app builds `Controls`
- **THEN** composition passes `createUiPort(app)`
- **AND** the App instance is not exposed directly

### Requirement: Transitional port honesty

The UI port SHALL be documented as a transitional contract.

#### Scenario: Future split

- **WHEN** the port is split into render, fabrication or notebook ports
- **THEN** `UI_SURFACE` shrinks rather than growing without review
- **AND** panel behavior remains unchanged

### Requirement: Fabrication UI port

The Fabricate panel SHALL consume a narrow fabrication port instead of the full
UI surface.

#### Scenario: Panel access

- **WHEN** the Fabricate section needs document, exporter, rebuild or Product
  preview
- **THEN** it reads `controls.fabrication`
- **AND** does not read `controls.app`

#### Scenario: Composition

- **WHEN** `createApp` builds `Controls`
- **THEN** it injects `createFabricationPort(app)`
- **AND** the port exposes only `document`, `exporter`, `rebuild`,
  `scheduleSessionSave`, `setProductPreviewEnabled` and `syncProductPreview`

### Requirement: Narrowing direction

Port splits SHALL reduce the UI surface, not duplicate it.

#### Scenario: Future ports

- **WHEN** Render, Notebook or Preset ports are split
- **THEN** `UI_SURFACE` shrinks or stops growing
- **AND** panels keep their current behavior

### Requirement: Render UI port

Renderer-dependent UI SHALL use a narrow render port.

#### Scenario: Frame and coordinate access

- **WHEN** Timeline, Advisor, Look coordinates or Surface Inspector need a
  renderer operation
- **THEN** they use `controls.render` or the injected `renderPort`
- **AND** do not read `app.renderer` directly

### Requirement: Notebook UI port

The Notebook panel SHALL use a narrow notebook port.

#### Scenario: Panel access

- **WHEN** NotebookPanel needs document, checkpoints, dialogs or workspace
- **THEN** every member comes from `NOTEBOOK_PORT`
- **AND** unrelated App members are unavailable

### Requirement: Port split direction

Splitting ports SHALL reduce the broad UI surface.

#### Scenario: Composition

- **WHEN** `createApp` builds `Controls`
- **THEN** it injects fabrication, render and notebook ports
- **AND** the remaining `UI_SURFACE` is smaller or unchanged

### Requirement: Preset UI port

The preset browser and save/delete controls SHALL use a narrow preset port.

#### Scenario: Preset access

- **WHEN** PresetPanel or the preset controls need document, presets, import or
  notification
- **THEN** every member is listed in `PRESET_PORT`
- **AND** unrelated App members are unavailable

### Requirement: Laboratory UI port

Analysis, Explore and Evolution panels SHALL use a narrow laboratory port.

#### Scenario: Lab access

- **WHEN** a laboratory panel needs document analysis, candidate adoption,
  notebook or checkpoint save
- **THEN** every member is listed in `LAB_PORT`
- **AND** the UI surface does not grow

### Requirement: Port coverage

Boundary checks SHALL scan the panel source for every `app.*` use.

#### Scenario: New dependency

- **WHEN** a preset or lab panel uses a new App member
- **THEN** the architecture test fails until the port is updated deliberately

### Requirement: Domain look and picking policy

Pure look presets, scene contracts and picking math SHALL live in domain.

#### Scenario: Application import

- **WHEN** the application applies a look, builds a render scene or picks a
  surface
- **THEN** it imports `domain/lookPresets.js`, `domain/scene.js` or
  `domain/interaction/`
- **AND** does not import `render/lookPresets`, `render/scene` or
  `interaction/ray|surfacePicker`

### Requirement: Panel-specific ports

UI panels SHALL receive narrow ports rather than the broad control surface.

#### Scenario: Form, Look, Keep, Ingest, Advisor and Start With

- **WHEN** a panel is constructed
- **THEN** it receives only its documented port
- **AND** unknown members are unavailable

### Requirement: Hardened dependency gate

The architecture gate SHALL forbid application → render/interaction and UI →
composition/App.

#### Scenario: Gate run

- **WHEN** `npm run arch:check` runs
- **THEN** application → render and application → interaction fail
- **AND** the known-violations baseline remains empty

### Requirement: Typed domain slice

Pure domain policy SHALL be strict TypeScript.

#### Scenario: Conversion

- **WHEN** `units`, `overlays`, `fabrication`, `scene`, `passStyle` or
  `modeToggles` is used
- **THEN** the implementation is a `.ts` module
- **AND** unknown input is narrowed at the boundary

#### Scenario: Compatibility

- **WHEN** existing code imports the old `.js` path
- **THEN** a compatibility re-export resolves
- **AND** runtime behavior is unchanged

### Requirement: Typed import strategy

TypeScript domain imports SHALL resolve under Vite, `tsx` and `tsc`.

#### Scenario: Gate

- **WHEN** `npm run check` runs
- **THEN** `tsc --noEmit` passes with `allowImportingTsExtensions`
- **AND** the production build resolves the same modules

### Requirement: Typed look and manufacturing policy

Look and manufacturing policy SHALL be strict TypeScript.

#### Scenario: Look

- **WHEN** a preset is resolved, matched or applied
- **THEN** the module is `domain/lookPresets.ts`
- **AND** view/user-look data is typed at the boundary

#### Scenario: Manufacturing

- **WHEN** a profile is sanitized or a report is built
- **THEN** the module is `domain/manufacturingProfile.ts`
- **AND** checks and report fields are typed

### Requirement: Compatibility during migration

Old JS paths SHALL remain re-exports while consumers migrate.

#### Scenario: Import

- **WHEN** code imports `render/lookPresets` or
  `geometry/manufacturingProfile`
- **THEN** the old path resolves
- **AND** the implementation is the typed domain module

### Requirement: Typed interaction domain

Ray and surface-picking math SHALL be strict TypeScript.

#### Scenario: Ray

- **WHEN** a cursor is converted to a world ray
- **THEN** vectors, transforms and bounds are typed
- **AND** invalid numeric input returns null

#### Scenario: Pick

- **WHEN** a surface is picked or a stored pick is validated
- **THEN** meshes, mappings, UVs and cells are validated before use
- **AND** the pick result is typed

### Requirement: Domain completion

The domain layer SHALL contain no JavaScript runtime modules.

#### Scenario: Boundary scan

- **WHEN** the domain is inspected
- **THEN** every runtime file is `.ts`
- **AND** old interaction paths remain compatibility re-exports

### Requirement: Typed application seam

The animation transport and fabrication job boundary SHALL be strict TypeScript.

#### Scenario: Animation

- **WHEN** playback advances
- **THEN** time and speed are narrowed from unknown
- **AND** paused playback returns null

#### Scenario: Worker

- **WHEN** a heavy fabrication job runs
- **THEN** worker messages, progress and reports are typed
- **AND** the synchronous fallback uses the same contract

### Requirement: Compatibility during application migration

Old application `.js` imports SHALL keep resolving.

#### Scenario: Import

- **WHEN** a worker, panel or test imports the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed scene builder

The application render scene builder SHALL be strict TypeScript.

#### Scenario: Scene build

- **WHEN** evaluation, document and view state are converted into a RenderScene
- **THEN** inputs and group results are typed
- **AND** unknown adapter fields are narrowed before use

#### Scenario: Preview

- **WHEN** a prepared fabrication preview replaces the authored scene
- **THEN** the preview path is typed
- **AND** its output matches the existing scene contract

### Requirement: Scene compatibility

The old `application/renderSceneBuilder.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, Exporter, renderers or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed fabrication source

The fabrication source resolver and report builder SHALL be strict TypeScript.

#### Scenario: Source resolution

- **WHEN** an evaluation is resolved into a fabrication source
- **THEN** layers, meshes, candidates and validation are typed
- **AND** null candidates are filtered before booleans and merges

#### Scenario: Report

- **WHEN** a report is built
- **THEN** units, bbox, printability, manufacturing and exportability are typed
- **AND** output values are unchanged

### Requirement: Fabrication compatibility

The old `application/fabricationSource.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** jobs, tests or export call the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed core infrastructure

The core history, persistence and session modules SHALL be strict TypeScript.

#### Scenario: History

- **WHEN** document snapshots are recorded, undone or redone
- **THEN** the bounded history is typed
- **AND** its limit and stack behavior are unchanged

#### Scenario: Persistence and migration

- **WHEN** storage is read, written, backed up or migrated
- **THEN** the storage boundary and migration result are typed
- **AND** keys, order and error reporting are unchanged

#### Scenario: Session

- **WHEN** a document snapshot is scheduled, flushed, saved or loaded
- **THEN** the debounced session store is typed
- **AND** the saved payload shape is unchanged

### Requirement: Typed notebook repository

The notebook storage boundary SHALL be strict TypeScript.

#### Scenario: Notebook persistence

- **WHEN** the notebook loads, saves or clears a snapshot
- **THEN** local and memory repositories are typed
- **AND** the notebook migration is typed

### Requirement: Core compatibility

The old `core/history.js`, `core/persistence.js`, `core/session.js` and
`lab/notebookRepository.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, panels, lab or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed export encoders

The ZIP, GIF, STL and 3MF encoders SHALL be strict TypeScript.

#### Scenario: Frame archive

- **WHEN** PNG frames and a manifest are packed into a ZIP
- **THEN** entries and byte buffers are typed
- **AND** the archive layout is unchanged

#### Scenario: Animated export

- **WHEN** timeline frames are encoded as GIF
- **THEN** frame dimensions, RGBA data, palette and delay are typed
- **AND** the frame cap and palette sampling are unchanged

#### Scenario: Fabrication export

- **WHEN** a validated Mesh/Solid is exported as binary STL or 3MF
- **THEN** geometry, validation, scale and output bytes are typed
- **AND** facet order, XML ordering and triangulation are unchanged

### Requirement: Typed export contract

The shared fabrication export validation contract SHALL be strict TypeScript.

#### Scenario: Validation

- **WHEN** an exporter validates geometry
- **THEN** errors, warnings and metadata are typed
- **AND** unsupported inputs keep the same rejection message

### Requirement: Export compatibility

The old `export/zip.js`, `export/gif.js`, `export/stl.js`, `export/3mf.js` and
`export/geometryExport.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** Exporter, timeline, tests or presets import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed App controller

The application controller SHALL be strict TypeScript.

#### Scenario: Controller state

- **WHEN** the controller is constructed
- **THEN** document, evaluation, history, session, notebook, preview, overlay,
  renderer and controls state is typed
- **AND** services and adapter factories arrive through structural ports

#### Scenario: Controller flows

- **WHEN** documents are evaluated, mutated, restored, exported or previewed
- **THEN** method inputs and outputs are typed
- **AND** behavior is unchanged

### Requirement: App compatibility

The old `application/App.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** composition or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed SVG recorder

The SVG recorder SHALL be strict TypeScript.

#### Scenario: Pass replay

- **WHEN** render passes draw into the recorder
- **THEN** fill, stroke, weight, cap, join, text, shapes, gradients and markup
  state are typed
- **AND** emitted SVG is unchanged

### Requirement: Typed export adapter

The Exporter SHALL be strict TypeScript and depend only on its export port.

#### Scenario: Export port

- **WHEN** SVG, PNG, GIF, STL, 3MF or JSON export runs
- **THEN** the adapter reads document, evaluation, renderer, fabrication and
  serialization state through `ExportPort`
- **AND** a legacy plain context is normalized to the same port

#### Scenario: Exports

- **WHEN** a user builds SVG, quad or plotter SVG, PNG, GIF, STL, 3MF or JSON
- **THEN** builder inputs and results are typed
- **AND** output and download behavior are unchanged

### Requirement: Exporter compatibility

The old `export/svgContext.js` and `export/Exporter.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** composition, tests or UI import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed render helpers

The shared render helpers SHALL be strict TypeScript.

#### Scenario: Projection and fill

- **WHEN** curves are projected for orthographic views or filled
- **THEN** points, projections, fills, gradients and contexts are typed
- **AND** projected coordinates and paint output are unchanged

#### Scenario: Reference and thumbnails

- **WHEN** spatial reference geometry or exploration thumbnails are drawn
- **THEN** their contexts, options and bounds are typed
- **AND** output is unchanged

#### Scenario: Trace fill

- **WHEN** image-derived layers share a trace group
- **THEN** grouped layers, fills, curves and bounds are typed
- **AND** even-odd fill behavior is unchanged

### Requirement: Typed render stores

The palette and look stores SHALL be strict TypeScript.

#### Scenario: Palettes

- **WHEN** built-in or custom palettes are listed, saved or deleted
- **THEN** palette records and storage errors are typed
- **AND** the stored format is unchanged

#### Scenario: Looks

- **WHEN** user looks are sanitized, listed, saved or removed
- **THEN** look records and save results are typed
- **AND** the stored format is unchanged

### Requirement: Renderer contract

The renderer backend contract SHALL be strict TypeScript.

#### Scenario: Backend

- **WHEN** a renderer mounts, resizes, renders, captures or is destroyed
- **THEN** the contract methods are typed
- **AND** concrete adapters keep their behavior

### Requirement: Render compatibility

The old `render/*.js` paths for the converted helpers SHALL keep resolving.

#### Scenario: Import

- **WHEN** adapters, passes, presets or UI import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed render passes

The registered render passes SHALL be strict TypeScript.

#### Scenario: Pass registration

- **WHEN** a pass registers itself
- **THEN** its `appliesTo` and `draw` inputs are typed
- **AND** registration order is unchanged

#### Scenario: Curve passes

- **WHEN** stroke, points, wireframe, gradient, tangent, normal, curvature,
  topology or epicycle passes draw
- **THEN** curves, points, styles, analysis and context calls are typed
- **AND** canvas and SVG output are unchanged

#### Scenario: Surface passes

- **WHEN** surface wireframe, fill or lattice preview draws
- **THEN** meshes, faces, depth and fills are typed
- **AND** painter order and preview output are unchanged

### Requirement: Pass compatibility

The old `render/passes/*.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the pass index or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed support helpers

The pure view, sampling, analysis, animation, mutation and viz helpers SHALL
be strict TypeScript.

#### Scenario: Camera and reference

- **WHEN** camera projection, orbit/zoom or spatial reference geometry is built
- **THEN** camera state, transforms and reference runs are typed
- **AND** output is unchanged

#### Scenario: Sampling and analysis

- **WHEN** generators sample parametric curves or analysis computes tangents,
  normals, curvature, intersections and arc length
- **THEN** points, curves, options and results are typed
- **AND** numerical output is unchanged

#### Scenario: Timeline and mutation

- **WHEN** keyframes are sanitized, resolved or used to mutate a document
- **THEN** timelines, tracks, contexts and mutation candidates are typed
- **AND** selection and evaluation behavior is unchanged

#### Scenario: Diagnostic overlays

- **WHEN** inflection, sample, ruler or bbox overlays draw
- **THEN** curves, analysis, bounds and contexts are typed
- **AND** overlay output is unchanged

### Requirement: Support helper compatibility

The old support-helper `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** engine, generators, renderer, lab, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed view pipeline

The world/view/artboard transform, projection and viewport-coordinate helpers
SHALL be strict TypeScript.

#### Scenario: Transform

- **WHEN** a view transform maps world points to artboard or device space
- **THEN** frames, bounds, projected points and the transform are typed
- **AND** framing output is unchanged

#### Scenario: Projection

- **WHEN** world curves and meshes are projected in 3D or orthographic views
- **THEN** curves, meshes, options, camera and projected points are typed
- **AND** splitting, depth and axis behavior are unchanged

#### Scenario: Viewport coordinates

- **WHEN** panel descriptors, world readouts, ranges, ticks or quad panels are built
- **THEN** axes, units, ranges, ticks and layout are typed
- **AND** displayed coordinates are unchanged

### Requirement: View pipeline compatibility

The old `view/transform.js`, `view/projection.js` and
`view/viewportCoordinates.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** engine, scene builder, renderer, picking, export or tests import the
  old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed core support

The core schema, registry, layer graph, capabilities and fill-gradient helpers
SHALL be strict TypeScript.

#### Scenario: Schema

- **WHEN** defaults, values, params or harmonics are sanitized
- **THEN** schema entries, types and animatable values are typed
- **AND** clamping and fallbacks are unchanged

#### Scenario: Registry

- **WHEN** generators, operators or render passes register and resolve
- **THEN** stage definitions and registries are typed
- **AND** validation errors and frozen definitions are unchanged

#### Scenario: Layers

- **WHEN** layers, instance sources or dependent instances are inspected
- **THEN** sources, generators, indices and candidates are typed
- **AND** layer limit rules are unchanged

#### Scenario: Paint and capabilities

- **WHEN** capabilities or fill gradients are resolved
- **THEN** capability flags and gradient specs are typed
- **AND** defaults, bounds and stops are unchanged

### Requirement: Core support compatibility

The old core support `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** engine, document, generators, passes, App, UI or tests import the old
  paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed document model

The canonical document, view, layer and style model SHALL be strict
TypeScript.

#### Scenario: Defaults and creation

- **WHEN** a document, view, style, artboard, layer or instance is created
- **THEN** defaults and returned shapes are typed
- **AND** independent objects and frozen templates are unchanged

#### Scenario: Sanitization

- **WHEN** arbitrary persisted input is sanitized
- **THEN** view, camera, artboard, style, layers, operators, animation and
  fabrication settings are typed and narrowed
- **AND** fallbacks, limits and migrations are unchanged

#### Scenario: Layer aliases

- **WHEN** active-layer generator/operators/seed aliases are attached
- **THEN** accessors are typed without changing enumerability
- **AND** canonical `layers` data remains the source of truth

### Requirement: Document compatibility

The old `core/document.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** engine, presets, session, notebook, App, export, fabrication, UI or
  tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed lab support

The lab parameter, workspace, summary, diff, hash and sensitivity helpers SHALL
be strict TypeScript.

#### Scenario: Parameter refs

- **WHEN** numeric parameter references, schemas or stage paths are resolved
- **THEN** refs, schemas and stages are typed
- **AND** generator/operator ordering is unchanged

#### Scenario: Workspace

- **WHEN** projects, series or the active notebook target are resolved
- **THEN** notebook hosts, projects, series and targets are typed
- **AND** fallback rules are unchanged

#### Scenario: Summary and diffs

- **WHEN** a parametric summary or document/descriptor diff is built
- **THEN** rows, leaves, paths and deltas are typed
- **AND** filtering and formatting are unchanged

#### Scenario: Hashing and sensitivity

- **WHEN** content is canonically hashed or parameters are sensitivity-probed
- **THEN** canonical JSON, SHA-256 and probe results are typed
- **AND** digests and impact values are unchanged

### Requirement: Lab support compatibility

The old lab support `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, notebook, exploration, advisor, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed preview and advisor support

Preset previews and the advisor cache/prompt helpers SHALL be strict
TypeScript.

#### Scenario: Preset preview

- **WHEN** a preset document is hashed or rendered as a thumbnail
- **THEN** documents, options, keys and thumbnails are typed
- **AND** cache bypass and preview output are unchanged

#### Scenario: Advisor cache

- **WHEN** responses are cached by document/provider/prompt key
- **THEN** keys, values, recency and size are typed
- **AND** bounded eviction is unchanged

#### Scenario: Advisor prompt

- **WHEN** a grounded prompt is built from descriptors, diffs and sensitivity
- **THEN** input, compact summaries, messages and payload are typed
- **AND** the serialized payload is unchanged

### Requirement: Preview/advisor compatibility

The old `presets/preview.js`, `ai/cache.js` and `ai/prompt.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** presets, advisor, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed evaluation engine

The evaluation engine SHALL be strict TypeScript.

#### Scenario: Document evaluation

- **WHEN** a document, generator stack, spatial pipeline or surface pipeline is
  evaluated
- **THEN** stages, params, geometry, curves, errors, stats and caches are typed
- **AND** evaluated output and cache reuse are unchanged

#### Scenario: Layers and instances

- **WHEN** generator and instance layers are evaluated
- **THEN** layer results, source lookups, transforms and errors are typed
- **AND** layer order, visibility and instance rules are unchanged

#### Scenario: Budgets

- **WHEN** curves are sanitized, split or decimated
- **THEN** point budgets and curve contracts are typed
- **AND** point limits and decimation are unchanged

### Requirement: Engine compatibility

The old `core/engine.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, previews, presets, mutation, sensitivity, lab, export, UI or
  tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed p5 overlays

The p5 frame-context overlay helpers SHALL be strict TypeScript.

#### Scenario: Quad and coordinates

- **WHEN** quad panels, coordinate grids, ticks or cursor readouts draw
- **THEN** panels, descriptors, transforms, units and contexts are typed
- **AND** layout, clipping and tick output are unchanged

#### Scenario: Underlay and diagnostics

- **WHEN** the image underlay, seam overlay or surface inspection overlay draws
- **THEN** image, seam edges, inspection shapes and contexts are typed
- **AND** drawing order and output are unchanged

#### Scenario: Reference and guides

- **WHEN** spatial reference axes/ground or artboard guides draw
- **THEN** transforms, runs and clip rectangles are typed
- **AND** output is unchanged

### Requirement: p5 overlay compatibility

The old `render/p5/overlays.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** `P5Adapter` or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed product preview

The optional THREE/WebGL product preview SHALL be strict TypeScript.

#### Scenario: Mount and update

- **WHEN** the preview mounts or receives a RenderScene spatial body
- **THEN** app, scene, mesh, bounds, material and quality inputs are typed
- **AND** mesh construction and studio placement are unchanged

#### Scenario: Interaction and capture

- **WHEN** the user orbits, zooms, resizes or captures the preview
- **THEN** camera state, pointer/wheel events and capture output are typed
- **AND** behavior is unchanged

#### Scenario: Benchmark and degradation

- **WHEN** frames are benchmarked or quality degrades under load
- **THEN** timing samples, quality overrides and metrics are typed
- **AND** thresholds and notifications are unchanged

### Requirement: Product preview compatibility

The old `render/webgl/ProductPreview.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** composition or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed p5 adapter

The p5 rendering backend SHALL be strict TypeScript.

#### Scenario: Sketch and canvas

- **WHEN** p5 mounts, resizes or draws a frame
- **THEN** the p5 context, canvas, app, document, evaluation and scene are typed
- **AND** drawing order and artboard framing are unchanged

#### Scenario: Capture and thumbnails

- **WHEN** PNG data, thumbnails or RGBA frames are captured
- **THEN** crop, canvas and frame buffers are typed
- **AND** output sizes and capture mode are unchanged

#### Scenario: Camera and coordinates

- **WHEN** the user drags/zooms or coordinates are pinned/read
- **THEN** camera state, canvas points and pins are typed
- **AND** gating and readout behavior are unchanged

### Requirement: p5 adapter compatibility

The old `render/p5/P5Adapter.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** composition or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed figure descriptor

The deterministic figure descriptor SHALL be strict TypeScript.

#### Scenario: Descriptor computation

- **WHEN** a document, evaluated curves and optional layers/geometry are described
- **THEN** inputs, stats, world data and layer descriptors are typed
- **AND** values, hashes and ordering are unchanged

#### Scenario: Analysis helpers

- **WHEN** symmetry, Fourier, complexity, topology or coverage is computed
- **THEN** sampling, budgets and results are typed
- **AND** numerical output is unchanged

### Requirement: Descriptor compatibility

The old `lab/descriptor.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, notebook, sensitivity, advisor, UI or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed lab model

The notebook, exploration and evolution models SHALL be strict TypeScript.

#### Scenario: Notebook

- **WHEN** checkpoints, projects, series and imports are loaded, added, moved,
  compared or persisted
- **THEN** records, storage, limits and results are typed
- **AND** hierarchy and storage behavior are unchanged

#### Scenario: Exploration

- **WHEN** selections, locks, sweeps, randomisation, grids or morphs produce
  candidates
- **THEN** refs, options, candidates and documents are typed
- **AND** candidate math is unchanged

#### Scenario: Evolution

- **WHEN** a generation is bred from parents
- **THEN** parents, crossovers, structural changes, children and validation are
  typed
- **AND** deterministic breeding is unchanged

### Requirement: Lab model compatibility

The old `lab/notebook.js`, `lab/exploration.js` and `lab/evolution.js` paths
SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, Lab/Notebook panels or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed advisor

The offline advisor and optional providers SHALL be strict TypeScript.

#### Scenario: Suggestions

- **WHEN** paths are resolved and suggestions are validated, clamped or applied
- **THEN** paths, schemas, values and results are typed
- **AND** validation and clamping are unchanged

#### Scenario: Offline analysis

- **WHEN** an offline response is built from descriptors, diffs and rules
- **THEN** summaries, changes, suggestions and caveats are typed
- **AND** deterministic rules are unchanged

#### Scenario: Providers

- **WHEN** a provider is created or run with cache/image options
- **THEN** config, messages, response parsing, cache and fallback are typed
- **AND** network payloads and fallback behavior are unchanged

### Requirement: Advisor compatibility

The old `ai/offline.js` and `ai/provider.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, advisor panel or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed presets

The preset catalog, object builders, built-ins and manager SHALL be strict
TypeScript.

#### Scenario: Catalog

- **WHEN** categories, metadata or search results are produced
- **THEN** categories, metadata and entries are typed
- **AND** grouping and search are unchanged

#### Scenario: Built-ins and builders

- **WHEN** built-in preset factories or fabricate builders create documents
- **THEN** options, layers, units and documents are typed
- **AND** generated documents are unchanged

#### Scenario: Manager

- **WHEN** presets are loaded, saved, parsed, favorited, marked recent or
  previewed
- **THEN** user presets, metadata, preview caches and payloads are typed
- **AND** storage keys and behavior are unchanged

### Requirement: Presets compatibility

The old `presets/*.js` paths for these modules SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed composition ports

The composition ports SHALL be strict TypeScript.

#### Scenario: Port creation

- **WHEN** a UI/application port is created from App
- **THEN** its allow-list, getters and bound methods are typed
- **AND** runtime allow-list enforcement is unchanged

#### Scenario: UI proxy

- **WHEN** the UI port is read, set or checked
- **THEN** the proxy handlers are typed
- **AND** unknown properties still throw

### Requirement: Composition port compatibility

The old `composition/create*Port.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** createApp, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed image tracing

The image tracing pipeline SHALL be strict TypeScript.

#### Scenario: Trace

- **WHEN** image data is thresholded, labelled, traced and converted to Fourier
  harmonics
- **THEN** image data, points, harmonics, contours and results are typed
- **AND** tracing math, limits and output are unchanged

### Requirement: Typed browser entry

The composition root and browser entry SHALL be strict TypeScript.

#### Scenario: Boot

- **WHEN** the browser app starts
- **THEN** createApp options, services, adapters and the App return are typed
- **AND** the same concrete adapters and boot side effects are used

### Requirement: Input/entry compatibility

The old `input/imageTrace.js`, `composition/createApp.js` and `main.js` paths
SHALL keep resolving.

#### Scenario: Import

- **WHEN** UI, tests or HTML reference the old paths
- **THEN** compatibility modules resolve
- **AND** behavior is unchanged

### Requirement: Typed generator core

Generator context, composition helpers and the classic 2D generators SHALL be
strict TypeScript.

#### Scenario: Context and composition

- **WHEN** expressions are compiled or multi-curve generators compose points
- **THEN** contexts, scopes, branch functions and curves are typed
- **AND** sampling and post-processing are unchanged

#### Scenario: Classic generators

- **WHEN** Lissajous, Rose, Superformula, Harmonic Oscillator or Parametric
  generate curves
- **THEN** params, domains and sample functions are typed
- **AND** generated geometry is unchanged

### Requirement: Generator compatibility

The old generator `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed 2D generators

Polar, custom, Fourier, noise-field, concentric-ellipses and bilateral-spline
generators SHALL be strict TypeScript.

#### Scenario: Generation

- **WHEN** these generators sample curves or emit multiple curves
- **THEN** params, expressions, harmonics, branches and metadata are typed
- **AND** generated geometry is unchanged

### Requirement: 2D generator compatibility

The old generator `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed trochoids and splines

Trochoid, spirograph, Catmull-Rom, Bézier and cubic-spline generators SHALL be
strict TypeScript.

#### Scenario: Generation

- **WHEN** trochoid or spline families generate curves
- **THEN** params, turns, nodes, segments and sample options are typed
- **AND** geometry is unchanged

### Requirement: Trochoid/spline compatibility

The old `generators/trochoids.js` and `generators/splines.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed spatial generators

Parametric 3D, helix and parametric surface generators SHALL be strict
TypeScript.

#### Scenario: Generation

- **WHEN** 3D curves or surface grids are generated and projected
- **THEN** params, points, domains, seams and projection options are typed
- **AND** geometry is unchanged

### Requirement: Spatial generator compatibility

The old generator `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed attractors

The strange-attractor generators SHALL be strict TypeScript.

#### Scenario: Generation

- **WHEN** Lorenz, Clifford, De Jong or Aizawa trajectories are generated
- **THEN** params, starts, iteration and projections are typed
- **AND** geometry is unchanged

### Requirement: Attractor compatibility

The old `generators/attractors.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed surface lattice

The surface lattice generator SHALL be strict TypeScript.

#### Scenario: Generation

- **WHEN** a lattice network is built and projected
- **THEN** params, cells, edges, openings, cache and projection are typed
- **AND** geometry is unchanged

### Requirement: Lattice compatibility

The old `generators/surfaceLattice.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed operator core

Operator expression helpers and the registration index SHALL be strict
TypeScript.

#### Scenario: Expressions

- **WHEN** optional expressions are compiled or point expressions evaluated
- **THEN** sources, scopes, points and results are typed
- **AND** blank/error behavior is unchanged

#### Scenario: Registration

- **WHEN** the operator index loads
- **THEN** the same operator modules self-register in the same order
- **AND** behavior is unchanged

### Requirement: Operator core compatibility

The old `operators/expression.js` and `operators/index.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** operators or the app import the old paths
- **THEN** compatibility modules resolve
- **AND** behavior is unchanged

### Requirement: Typed transform operators

Translate, mirror, rotate, scale and normalize SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** transform operators map geometry points
- **THEN** params, points, scopes and counts are typed
- **AND** transformed geometry is unchanged

### Requirement: Transform compatibility

The old `operators/geometry/transform.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed resample operators

Resample, subdivide and smooth SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** curves are resampled, subdivided or smoothed
- **THEN** curves, params and helper points are typed
- **AND** output points and closed flags are unchanged

### Requirement: Resample compatibility

The old `operators/geometry/resample.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed offset and stroke operators

Offset, inflate, shrink, stroke expansion, ribbon and centerline SHALL be
strict TypeScript.

#### Scenario: Apply

- **WHEN** a polyline is offset or expanded
- **THEN** points, distances, closed flags and outlines are typed
- **AND** generated geometry is unchanged

### Requirement: Typed symmetry operators

Symmetrize, kaleidoscope and optical correction SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** curves are folded, mirrored or optically corrected
- **THEN** points, folds, centers and amounts are typed
- **AND** generated geometry is unchanged

### Requirement: Offset family compatibility

The old `operators/geometry/offset.js`, `symmetry.js` and `stroke.js` paths
SHALL keep resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed deform and expression operators

Twist, bend, warp, displace, noise displace and expression clip SHALL be strict
TypeScript.

#### Scenario: Apply

- **WHEN** curves are deformed or clipped by expressions
- **THEN** points, scopes, compiled expressions and runs are typed
- **AND** generated geometry is unchanged

### Requirement: Typed projection and boolean operators

Project, clip and boolean SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** curves are projected, clipped to a window or combined
- **THEN** targets, window predicates, rings and results are typed
- **AND** generated geometry is unchanged

### Requirement: Deform family compatibility

The old `operators/geometry/deform.js`, `project.js`, `expressionClip.js` and
`boolean.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed topology repeat operators

Duplicate, radial, linear, polar, grid and recursive repeat SHALL be strict
TypeScript.

#### Scenario: Apply

- **WHEN** geometry is duplicated or distributed
- **THEN** curves, params, transforms and ids are typed
- **AND** generated geometry is unchanged

### Requirement: Typed Voronoi and skeleton operators

Voronoi, skeleton and medial axis SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** cells or a skeleton are derived from curve samples
- **THEN** samples, triangulation fields, centers and segments are typed
- **AND** generated geometry is unchanged

### Requirement: Topology compatibility

The old `operators/topology/repeat.js` and `voronoi.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed geometry contracts

Canonical geometry kinds SHALL be strict TypeScript with exported point,
curve, surface, mesh and solid interfaces.

#### Scenario: Factory and predicates

- **WHEN** geometry is created or narrowed by kind
- **THEN** factories return typed geometry and predicates narrow the value
- **AND** emitted fields and defaults are unchanged

### Requirement: Typed geometry helpers

Trust metadata, kind conversions, world transforms and point mapping SHALL be
strict TypeScript.

#### Scenario: Mapping

- **WHEN** geometry is lifted, converted or mapped
- **THEN** points, transforms and results are typed
- **AND** geometry output is unchanged

### Requirement: Geometry contract compatibility

The old `geometry/contracts.js`, `trust.js`, `relations.js`, `transform.js` and
`transformGeometry.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed robust predicates

Orientation, exact determinants, snapping and adaptive tolerances SHALL be
strict TypeScript.

#### Scenario: Predicate evaluation

- **WHEN** points are classified or snapped
- **THEN** points, boxes and tolerances are typed
- **AND** signs, epsilons and snapped values are unchanged

### Requirement: Typed self-intersection detection

Triangle self-intersection diagnostics SHALL be strict TypeScript.

#### Scenario: Detection

- **WHEN** a mesh is checked for self-intersections
- **THEN** triangles, BVH nodes and face pairs are typed
- **AND** reported pairs, limits and truncation are unchanged

### Requirement: Predicate compatibility

The old `geometry/robustPredicates.js` and `selfIntersection.js` paths SHALL
keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed geometry validation

Curve, surface, mesh and solid validation SHALL be strict TypeScript.

#### Scenario: Validate

- **WHEN** geometry is validated
- **THEN** inputs, errors, warnings and metadata are typed
- **AND** checks and messages are unchanged

### Requirement: Typed printability checks

The heuristic printability summary SHALL be strict TypeScript.

#### Scenario: Printability

- **WHEN** overhang, bed contact and lattice limits are measured
- **THEN** options, areas, warnings and lattice fields are typed
- **AND** thresholds and reported values are unchanged

### Requirement: Validation compatibility

The old `geometry/validate.js` and `printChecks.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed surface analysis

World-space curve and surface analysis SHALL be strict TypeScript.

#### Scenario: Analyze

- **WHEN** curves or surfaces are analyzed
- **THEN** points, bboxes and per-kind records are typed
- **AND** metrics are unchanged

### Requirement: Typed surface tessellation and mapping

Surface tessellation and its mapping sidecar SHALL be strict TypeScript.

#### Scenario: Tessellate

- **WHEN** a surface is tessellated
- **THEN** options, corners, mapping faces and results are typed
- **AND** mesh topology, normals and mappings are unchanged

### Requirement: Typed UV domain and wireframes

UV domain summaries and mesh wireframes SHALL be strict TypeScript.

#### Scenario: Summarize

- **WHEN** a surface domain or wireframe is derived
- **THEN** ranges, seams, runs and curves are typed
- **AND** reported values and ids are unchanged

### Requirement: Surface helper compatibility

The old `geometry/analysis.js`, `uvDomain.js`, `surfaceTessellation.js` and
`wireframe.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed legacy glyph bridge

Legacy Curve[] conversion SHALL be strict TypeScript.

#### Scenario: Convert

- **WHEN** legacy curves are imported or exported
- **THEN** legacy points, spatial flags and projected points are typed
- **AND** generated curves are unchanged

### Requirement: Typed spline classes

Catmull-Rom, master spline, mirror and optical correction SHALL be strict
TypeScript.

#### Scenario: Build glyph

- **WHEN** a glyph is built from controls and mirrored
- **THEN** control points, segments, samples and metrics are typed
- **AND** geometry and metrics are unchanged

### Requirement: Legacy compatibility

The old `geometry/legacy.js` and `geometry/legacy/*.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed SDF repair and joints

Signed-distance repair and local joint blending SHALL be strict TypeScript.

#### Scenario: Repair

- **WHEN** a mesh is reconstructed or a joint is blended from capsules
- **THEN** SDF points, bounds, options and stats are typed
- **AND** reconstruction parameters are unchanged

### Requirement: Typed lattice spec and perforation

Lattice normalization and perforation cutters SHALL be strict TypeScript.

#### Scenario: Normalize

- **WHEN** lattice params are normalized or holes are generated
- **THEN** specs, profiles, seeds and cutters are typed
- **AND** hashes, hole placement and limits are unchanged

### Requirement: Fabrication helper compatibility

The old `geometry/sdfRepair.js`, `latticeSpec.js`, `latticeJointBlend.js` and
`perforation.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed solid preparation

Weld, boundary loops, caps, merge and prepareMesh SHALL be strict TypeScript.

#### Scenario: Prepare

- **WHEN** a fabrication mesh is welded, capped or merged
- **THEN** meshes, loops, stats and warnings are typed
- **AND** prepared geometry and stats are unchanged

### Requirement: Solid prep compatibility

The old `geometry/solidPrep.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed topology repair

Non-manifold fan splitting and non-orientable seam cuts SHALL be strict
TypeScript.

#### Scenario: Repair

- **WHEN** a mesh has non-manifold or non-orientable topology
- **THEN** edges, fans, conflicts, vertices and reports are typed
- **AND** topology output and report counters are unchanged

### Requirement: Topology repair compatibility

The old `geometry/topologyRepair.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed composed mesh repair

Cleanup, welding, caps, orientation repair and the composed repair result SHALL
be strict TypeScript.

#### Scenario: Repair

- **WHEN** a mesh is repaired for fabrication
- **THEN** reports, edges, shells, caps and validations are typed
- **AND** repaired geometry and report counters are unchanged

### Requirement: Typed self-intersection repair

Remesh-based self-intersection repair SHALL be strict TypeScript.

#### Scenario: Resolve

- **WHEN** self-intersections are resolved through SDF or remesh
- **THEN** detection, strategy reports and deltas are typed
- **AND** strategy selection and output geometry are unchanged

### Requirement: Repair compatibility

The old `geometry/repair.js` and `selfIntersectionRepair.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed Manifold adapter

Manifold loading, booleans, simplify and level sets SHALL be strict TypeScript.

#### Scenario: Boolean

- **WHEN** operands are combined through Manifold
- **THEN** module, meshes, validations, stats and failures are typed
- **AND** boolean output and repair fallbacks are unchanged

#### Scenario: Level set

- **WHEN** an SDF is reconstructed
- **THEN** bounds, tolerance, edge length and results are typed
- **AND** level-set output is unchanged

### Requirement: Manifold adapter compatibility

The old `geometry/manifoldEngine.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed CSG booleans

BSP constructive solid geometry SHALL be strict TypeScript.

#### Scenario: Boolean

- **WHEN** validated solids are combined
- **THEN** operands, planes, polygons, budgets, stats and results are typed
- **AND** boolean output and fallbacks are unchanged

### Requirement: Typed T-junction repair

T-junction insertion and face deduplication SHALL be strict TypeScript.

#### Scenario: Repair

- **WHEN** BSP output contains T-junctions
- **THEN** vertex grids, inserted splits and faces are typed
- **AND** repaired topology is unchanged

### Requirement: CSG compatibility

The old `geometry/csg.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed voxel remeshing

Voxel remeshing and feature projection SHALL be strict TypeScript.

#### Scenario: Remesh

- **WHEN** meshes are remeshed into an iso-surface
- **THEN** grids, tetrahedra, vertices, projection and repair results are typed
- **AND** remeshed geometry is unchanged

### Requirement: Typed triangle BVH queries

Triangle BVH construction, closest points, inside tests and winding numbers
SHALL be strict TypeScript.

#### Scenario: Query

- **WHEN** inside tests or winding numbers are evaluated
- **THEN** nodes, triangles, rays and results are typed
- **AND** query results are unchanged

### Requirement: Remesh compatibility

The old `geometry/remesh.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Single typed image tracing implementation

The image tracing pipeline SHALL have one implementation, `input/imageTrace.ts`.

#### Scenario: Import

- **WHEN** UI, tests or e2e import `input/imageTrace.js`
- **THEN** the path re-exports the typed module
- **AND** tracing math, limits and output are unchanged

### Requirement: Typed expression engine

Tokenization, parsing and evaluation SHALL be strict TypeScript.

#### Scenario: Compile

- **WHEN** user equations are compiled and evaluated
- **THEN** tokens, AST nodes, scopes, results and span errors are typed
- **AND** precedence, associativity and errors are unchanged

### Requirement: Typed math library

Noise, stdlib and spline math SHALL be strict TypeScript.

#### Scenario: Evaluate

- **WHEN** noise, stdlib functions or splines are used
- **THEN** seeds, functions, segments and points are typed
- **AND** numeric output is unchanged

### Requirement: Math compatibility

The old `math/expression.js`, `noise.js`, `stdlib.js` and `curves.js` paths
SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed curve sampling

Uniform/adaptive sampling and discontinuity splitting SHALL be strict
TypeScript.

#### Scenario: Sample

- **WHEN** a generator samples its parameter domain
- **THEN** intervals, heaps, runs and split results are typed
- **AND** sample counts and split thresholds are unchanged

### Requirement: Typed sampling helpers

Arc length, resampling, bboxes, fitting and centering SHALL be strict
TypeScript.

#### Scenario: Normalize

- **WHEN** curves are resampled, fitted or centered
- **THEN** tables, counts, bboxes and point types are typed
- **AND** normalized geometry is unchanged

### Requirement: Sampling compatibility

The old `sampling/sampling.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed worker entry

The fabrication worker entry SHALL be strict TypeScript.

#### Scenario: Run

- **WHEN** a heavy fabrication job is posted to the worker
- **THEN** messages, inputs, progress and errors are typed
- **AND** job execution and messages are unchanged

### Requirement: Typed adapter indexes

Generator/render-pass indexes and render aliases SHALL be strict TypeScript.

#### Scenario: Import

- **WHEN** the app imports the adapter indexes
- **THEN** registration order and alias exports are unchanged

### Requirement: Adapter compatibility

The old worker/index/alias paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules or worker URLs use the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed inspection overlay

Inspection overlay derivation SHALL be strict TypeScript.

#### Scenario: Inspect

- **WHEN** an inspected point, triangle or cell is overlaid
- **THEN** layers, mappings, transforms and artboard points are typed
- **AND** overlay geometry is unchanged

### Requirement: Typed seam overlay

Seam/domain overlay derivation SHALL be strict TypeScript.

#### Scenario: Seams

- **WHEN** domain seams and borders are overlaid
- **THEN** UV edges, classifications, statuses and counts are typed
- **AND** overlay edges are unchanged

### Requirement: Overlay compatibility

The old `interaction/inspectionOverlay.js` and `seamOverlay.js` paths SHALL
keep resolving.

#### Scenario: Import

- **WHEN** render overlays import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed lattice network

The surface-of-revolution lattice network SHALL be strict TypeScript.

#### Scenario: Build

- **WHEN** a lattice network is generated from a spec
- **THEN** seeds, cells, openings, nodes, edges and stats are typed
- **AND** network geometry, ordering and hashes are unchanged

### Requirement: Lattice network compatibility

The old `geometry/latticeNetwork.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** generators, perforation or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed lattice solid

Lattice strut, joint, floor, rim and opening logic SHALL be strict TypeScript.

#### Scenario: Build

- **WHEN** a lattice network is converted into one solid
- **THEN** curves, tubes, joints, closures, gauges and stats are typed
- **AND** solid geometry and fallbacks are unchanged

### Requirement: Typed geometry barrel

The geometry barrel SHALL re-export typed modules only.

#### Scenario: Import

- **WHEN** geometry modules are imported through the barrel
- **THEN** it resolves to the typed modules
- **AND** exported names are unchanged

### Requirement: Geometry compatibility

The old `geometry/latticeSolid.js` and `geometry/index.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed shared UI surfaces

Seam legend, parametric overlay, dialogs and harmonics editor SHALL be strict
TypeScript.

#### Scenario: Render

- **WHEN** these surfaces render or open
- **THEN** app/document inputs, statuses, dialog results and rows are typed
- **AND** DOM structure, copy and behavior are unchanged

### Requirement: Shared UI compatibility

The old `ui/SeamLegend.js`, `ui/ParametricOverlay.js`, `ui/dialogs.js`,
`ui/widgets/HarmonicsEditor.js` and `ui/widgets/modeToggles.js` paths SHALL
keep resolving.

#### Scenario: Import

- **WHEN** panels or the canvas import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed parameter binding

Parameter type registration and stage binding SHALL be strict TypeScript.

#### Scenario: Bind

- **WHEN** generator/operator params are bound to lil-gui
- **THEN** definitions, contexts, stages, controllers and entries are typed
- **AND** created controls and folders are unchanged

### Requirement: Param binding compatibility

The old `ui/params/ParamRegistry.js` and `ui/params/StageEditor.js` paths SHALL
keep resolving.

#### Scenario: Import

- **WHEN** Controls or OperatorStack import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged

### Requirement: Typed expression field

The CodeMirror expression field SHALL be strict TypeScript.

#### Scenario: Edit

- **WHEN** a formula is edited, committed or disabled
- **THEN** options, extensions, timers and states are typed
- **AND** tokens, highlighting, debounce and markup are unchanged

### Requirement: Expression field compatibility

The old `ui/widgets/ExpressionField.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls, OperatorStack or StageEditor import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed operator stack

The operator stack editor SHALL be strict TypeScript.

#### Scenario: Edit

- **WHEN** operators are added, removed, reordered, toggled or edited
- **THEN** app/form port methods, stages, expressions and errors are typed
- **AND** behavior, labels and order are unchanged

### Requirement: Operator stack compatibility

The old `ui/widgets/OperatorStack.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** architecture port checks read the typed module

### Requirement: Typed lab panel

The lab observation panel SHALL be strict TypeScript.

#### Scenario: Analyze

- **WHEN** metrics or sensitivity are rendered
- **THEN** descriptors, entries and states are typed
- **AND** metric values and ranking are unchanged

### Requirement: Typed start-with chooser

The start-with overlay SHALL be strict TypeScript.

#### Scenario: Choose

- **WHEN** a starting document is chosen or cancelled
- **THEN** choices, cards, dialog results and focus are typed
- **AND** modal copy, focus trap and previews are unchanged

### Requirement: Lab/start compatibility

The old `ui/widgets/LabPanel.js` and `ui/StartWithOverlay.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** Controls starts the overlay or panel
- **THEN** compatibility re-exports resolve
- **AND** architecture port checks read the typed modules

### Requirement: Typed explore panel

The Explore panel SHALL be strict TypeScript.

#### Scenario: Explore

- **WHEN** strips, grids, morphs or scope locks are used
- **THEN** refs, candidates, controls, ports and DOM state are typed
- **AND** candidate generation and adoption are unchanged

### Requirement: Explore compatibility

The old `ui/widgets/ExplorePanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** lab-port checks read the typed module

### Requirement: Typed evolution panel

The evolution panel SHALL be strict TypeScript.

#### Scenario: Breed

- **WHEN** parents are selected and a generation is bred or kept
- **THEN** checkpoints, children, evaluations and options are typed
- **AND** breeding, previews and keep behavior are unchanged

### Requirement: Evolution compatibility

The old `ui/widgets/EvolutionPanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** lab-port checks read the typed module

### Requirement: Typed preset panel

The preset panel SHALL be strict TypeScript.

#### Scenario: Browse

- **WHEN** presets are searched, filtered, previewed or favorited
- **THEN** entries, categories, ports and preview queues are typed
- **AND** browsing and preview behavior are unchanged

### Requirement: Preset compatibility

The old `ui/widgets/PresetPanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** preset-port checks read the typed module

### Requirement: Typed notebook panel

The notebook panel SHALL be strict TypeScript.

#### Scenario: Manage checkpoints

- **WHEN** checkpoints are saved, organized, edited, compared or restored
- **THEN** checkpoints, projects, series, diffs and ports are typed
- **AND** notebook behavior is unchanged

### Requirement: Notebook compatibility

The old `ui/widgets/NotebookPanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** notebook-port checks read the typed module

### Requirement: Typed surface inspector

The surface inspector SHALL be strict TypeScript.

#### Scenario: Inspect

- **WHEN** a surface is hovered, pinned or invalidated
- **THEN** pick results, ports, pins and rows are typed
- **AND** readout and behavior are unchanged

### Requirement: Surface inspector compatibility

The old `ui/SurfaceInspector.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the canvas imports the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed UV domain inset

The UV domain inset SHALL be strict TypeScript.

#### Scenario: Render

- **WHEN** the active surface domain is displayed
- **THEN** summaries, axes, app ports and SVG nodes are typed
- **AND** chart geometry, labels and dataset are unchanged

### Requirement: UV inset compatibility

The old `ui/UVDomainInset.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the canvas imports the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

### Requirement: Typed advisor panel

The advisor panel SHALL be strict TypeScript.

#### Scenario: Advise

- **WHEN** a provider analyzes the figure and suggestions are previewed/applied
- **THEN** providers, responses, suggestions, settings and ports are typed
- **AND** privacy, previews and apply behavior are unchanged

### Requirement: Advisor panel module compatibility

The old `ui/widgets/AdvisorPanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** advisor-port checks read the typed module

### Requirement: Typed image panel

The image panel SHALL be strict TypeScript.

#### Scenario: Trace

- **WHEN** an image is loaded, thresholded and traced
- **THEN** sources, underlays, results and ports are typed
- **AND** loading, previews and tracing are unchanged

### Requirement: Image panel compatibility

The old `ui/widgets/ImagePanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** ingest-port checks read the typed module

### Requirement: Typed timeline panel

The timeline panel SHALL be strict TypeScript.

#### Scenario: Animate

- **WHEN** tracks and keyframes are edited, recorded or exported
- **THEN** timelines, tracks, keyframes and ports are typed
- **AND** editing, recording and export output are unchanged

### Requirement: Timeline compatibility

The old `ui/widgets/TimelinePanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** timeline-port checks read the typed module

### Requirement: Typed form sections

Layer, instance, generator, parameter, equation, harmonic and operator
sections SHALL be strict TypeScript.

#### Scenario: Build

- **WHEN** form sections are built for a layer
- **THEN** controls, ports, layers, stages and schemas are typed
- **AND** section markup and behavior are unchanged

### Requirement: Form section compatibility

The old `ui/sections/formSections.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** form-port and maintainability checks read the typed module

