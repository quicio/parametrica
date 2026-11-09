# ADR-0004: Clean Architecture boundaries and dependency rule

Status: accepted
Date: 2026-11-09
Related: ADR-0005, ADR-0006, `openspec/specs/module-boundaries/spec.md`

## Context

Parametrica has 186 runtime source files, about 41,500 lines of JavaScript and
125 living specs. It already has real seams: the math/sampling/analysis core is
DOM-free, geometry contracts are explicit, registries are pluggable, fabrication
resolution is separated from export, and the composition root is identifiable.

It does **not** yet have a single, enforced dependency direction. A static
import scan found no cycles, but it found outward edges from inner modules:

| Inner module | Reaches | Why it matters |
|---|---|---|
| `src/core/document.js` | `render/passStyle`, `viz/overlays`, `geometry/repair`, `geometry/manufacturingProfile`, `view/*` | Document validation depends on rendering, diagnostics and fabrication infrastructure. |
| `src/core/engine.js` | `geometry/*`, `view/*` | The evaluator depends on mesh/CSG/tessellation and projection details instead of narrow contracts. |
| `src/generators/helpers.js` | `render/camera3d` | A generator helper reaches a renderer adapter to project 3D points. |
| `src/generators/surfaceLattice.js` | `render/camera3d` | A generator depends on render camera code. |
| `src/application/App.js` | `ui/*`, `render/*`, `lab/*`, `presets/*`, `export/*` | The composition root is mixed into the application layer. |
| `src/export/Exporter.js` | `application/renderSceneBuilder`, `application/fabricationSource` | An adapter imports application modules and takes the whole `App`. |
| `src/ui/*` | `core`, `render`, `lab`, `application` | Presentation reads concrete internals instead of ports/view models. |
| `src/geometry/manufacturingProfile.js` | `core/units` | Fine today, but `core` mixes domain and infrastructure concerns. |

There are also positive constraints to preserve:

- `math`, `sampling`, `analysis` and most geometry contracts are pure and
  Node-testable.
- `core/engine.js` is the single evaluation funnel.
- `application/fabricationSource.js` resolves a source without mutating the
  document.
- The worker boundary already exists for heavy fabrication.
- Tests are executable contracts, not mocks of the engine.

Without a dependency rule, TypeScript would only type the current coupling.
Boundaries must be fixed first; types then make them hard to violate.

## Decision

Adopt the **Clean Architecture dependency rule** for Parametrica:

```
composition  →  adapters  →  application  →  domain
     (outer)                                  (inner)
```

Source-code dependencies point inward. Frameworks, DOM, renderers, storage,
workers and the UI live outside; document rules, math and geometry contracts
live inside.

### Target layers

| Layer | Path | Owns | May depend on |
|---|---|---|---|
| **Domain** | `src/domain/` | Document entities/value objects, math, sampling, analysis, geometry contracts, pure fabrication rules, ports/interfaces | Nothing outer. Standard library only. |
| **Application** | `src/application/` | Use cases: evaluate, mutate, apply preset, notebook, persistence orchestration, resolve fabrication source, build export scene | Domain + its own ports |
| **Adapters** | `src/adapters/` (or existing `render`, `export`, `ui`, `lab`, `presets`, `workers` reclassified) | p5/WebGL, SVG/STL/3MF, localStorage, image tracing, worker, panels, presenters | Domain + application ports |
| **Composition** | `src/composition/` + `src/main.js` | Concrete registry registration, adapter selection, App wiring, DI | Everything |

The exact folder names may be adjusted during migration, but the dependency
direction and ownership are fixed.

### Ports

Inner layers define the interfaces they need; outer layers implement them:

- `FigureRepository` — load/save the current document and session.
- `NotebookRepository` — checkpoints, projects, series.
- `PresetRepository` — built-ins and user presets.
- `RenderPort` — render a scene, invalidate, capture a frame, expose canvas size.
- `ExportPort` — write SVG/PNG/GIF/STL/3MF/JSON.
- `FabricationPort` — resolve and prepare a fabrication body.
- `ClockPort` — time, debounce and animation transport.
- `FileSink` — download/clipboard boundary.
- `GeneratorRegistry` / `OperatorRegistry` — registration and lookup ports.

Ports do not import adapters, frameworks or the composition root. A fake and a
real implementation live in the adapter layer and are selected only in
composition.

### Composition root

`src/application/App.js` is currently both composition root and application
orchestrator. Split it:

- `src/composition/createApp.js` selects concrete adapters, registries and
  stores, then constructs the controller.
- `src/application/AppController.js` (or use-case modules) owns orchestration
  and depends on ports.
- `src/main.js` only bootstraps and mounts the composed app.

UI modules receive controllers, view models or callbacks. They do not import
`App.js`, a DI container or concrete adapters.

### Migration order

1. **Boundary extraction, behavior-preserving**
   - Move pure units/document primitives into `domain`.
   - Remove `document.js` imports of `render/passStyle`, `viz/overlays` and
     fabrication infrastructure by passing sanitized config/contracts inward.
   - Remove generator → render camera imports by moving projection math to
     `domain/view` or a pure projection module.
   - Introduce ports for render, export, persistence, fabrication and files.
2. **Composition split**
   - Move adapter selection out of `App.js` into `composition`.
   - Make `Exporter` depend on a scene/export input, not `App`.
   - Make UI depend on controller/view-model interfaces.
3. **TypeScript** (ADR-0005) on the resulting seams.
4. **Enforcement** (ADR-0006) with dependency-cruiser + `tsc`.

### Non-goals

- A big-bang rewrite.
- Changing document format, geometry contracts, export bytes or UI behavior.
- Adding a DI framework or class hierarchy for its own sake.
- Creating one interface per function; ports exist only where a real boundary
  or replaceable adapter exists.

## Consequences

- `document.js`, `engine.js` and `App.js` will be split; some imports move.
- The UI becomes thinner and testable without the full composition root.
- Export and fabrication become adapters around use cases, not methods on
  `App`.
- Tests will need ports/fakes in a few places, but the pure engine tests remain
  unchanged.
- The migration must be delivered in vertical slices with behavior parity; no
  spec changes are allowed without an OpenSpec change.
- The existing `module-boundaries` spec is extended rather than discarded.

## Alternatives considered

### Keep the current structure and add TypeScript only

Rejected. TypeScript would make the existing outward dependencies explicit and
harder to change, not fix them.

### Big-bang rewrite into `domain/application/adapters`

Rejected. 41,500 lines and 125 specs make a flag-day rewrite unsafe. The project
needs a walking skeleton: extract one seam, prove parity, repeat.

### Strict four-layer folders immediately

Rejected. Folder purity is not the goal. The dependency rule and replaceable
adapters are the goal; names can follow evidence.

### Keep `App.js` as both composition root and application layer

Rejected. It is the largest source of outward imports and makes UI/export tests
depend on the entire app.
