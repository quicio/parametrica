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

