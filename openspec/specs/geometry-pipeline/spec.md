# geometry-pipeline Specification

## Purpose
TBD - created by archiving change 2026-11-01-world-view-geometry. Update Purpose after archive.
## Requirements
### Requirement: Ordered geometry pipeline

The pipeline SHALL distinguish geometry, view and render stages.

#### Scenario: World stage

- **WHEN** a document is evaluated
- **THEN** generators and world operators produce typed world geometry
- **AND** normalization and validation run before analysis

#### Scenario: Analysis stage

- **WHEN** geometry analysis is requested
- **THEN** it operates on world geometry for spatial kinds
- **AND** screen-space overlays are computed separately

#### Scenario: View stage

- **WHEN** world geometry is ready
- **THEN** the view layer projects it into RenderScene
- **AND** no generator runs during projection

### Requirement: Stage type validation

Each pipeline stage SHALL validate the geometry kind it receives and produces.

#### Scenario: Wrong stage input

- **WHEN** an operator expects `curve2d` but receives `mesh`
- **THEN** evaluation reports a typed error at that stage
- **AND** subsequent stages do not receive the invalid result

### Requirement: Geometry ownership

Sampling, surface construction, tessellation, mesh generation and solid
validation SHALL belong to the geometry layer.

#### Scenario: Surface tessellation

- **WHEN** a Surface becomes a Mesh
- **THEN** tessellation runs in geometry
- **AND** the renderer receives render items, not a surface evaluator

#### Scenario: Solid validation

- **WHEN** a Mesh is promoted to Solid
- **THEN** validation belongs to geometry
- **AND** the renderer does not decide whether a solid is valid

### Requirement: Export pipeline

Render exports and fabrication exports SHALL be separate consumers.

#### Scenario: SVG

- **WHEN** the user exports SVG
- **THEN** the exporter consumes the projected RenderScene
- **AND** world geometry is not baked into a mesh

#### Scenario: STL/3MF contract

- **WHEN** mesh/solid export is added
- **THEN** the exporter consumes world Mesh/Solid
- **AND** it does not depend on p5, camera or document view

### Requirement: Independent pipeline caches

The pipeline SHALL use separate cache boundaries for world geometry, world
analysis, view projection and render results. No cache entry may be shared
across those boundaries.

#### Scenario: World Geometry Cache

- **WHEN** a generator, world operator or world transform is evaluated
- **THEN** its result is keyed by the generator id and resolved parameters,
  seed, time-dependent inputs, operator ids and parameters, geometry kind and
  pipeline algorithm version
- **AND** the key excludes camera, projection mode, fit, viewport and style
- **AND** a cached result contains world geometry only

#### Scenario: World Analysis Cache

- **WHEN** world metrics are requested
- **THEN** the result is keyed by world geometry identity/content and analysis
  version
- **AND** it is invalidated when world geometry changes
- **AND** camera, projection, fit, viewport and style changes do not invalidate
  it

#### Scenario: View Projection Cache

- **WHEN** world geometry is projected
- **THEN** the result is keyed by world geometry identity/content, camera
  yaw/pitch/FOV, projection mode, fit settings and viewport dimensions when
  they affect the output
- **AND** it is invalidated by any of those inputs
- **AND** it does not invalidate or mutate world geometry

#### Scenario: Render Cache

- **WHEN** a RenderScene or rendered frame is cached
- **THEN** the key includes the view projection result, styles, overlays,
  active render passes and presentation configuration
- **AND** changing a visual setting does not invalidate world geometry or world
  analysis

### Requirement: Cache invalidation and equivalence

Caching SHALL preserve correctness, partial reuse and document/layer isolation.

#### Scenario: Camera-only change

- **WHEN** yaw, pitch or FOV changes
- **THEN** world geometry is not re-evaluated
- **AND** generators and world operators are not re-executed
- **AND** only view projection and downstream render results are invalidated

#### Scenario: Viewport or fit change

- **WHEN** viewport dimensions or fit configuration change
- **THEN** world geometry and world metrics are unchanged
- **AND** view projection and render caches are invalidated where relevant

#### Scenario: Generator parameter change

- **WHEN** a generator parameter changes
- **THEN** the generator result and all downstream world, analysis, view and
  render results are invalidated
- **AND** unrelated documents and layers remain cached

#### Scenario: Operator parameter change

- **WHEN** operator `k` changes
- **THEN** results for stages before `k` are reused
- **AND** stages from `k` onward are recomputed

#### Scenario: Document and layer isolation

- **WHEN** two documents or two layers are evaluated
- **THEN** their cache entries are isolated
- **AND** evaluating one layer cannot evict or corrupt another layer's entry
- **AND** a multi-layer document does not lose upstream reuse because of
  recursive evaluation

#### Scenario: Cache equivalence

- **WHEN** the same document is evaluated with caching enabled and disabled
- **THEN** curves, geometry, world metrics, errors, projected scene and stats
  are equivalent
- **AND** differences are limited to timing fields

#### Scenario: Visual-only change

- **WHEN** style, overlays, guides or render passes change
- **THEN** world geometry and world analysis caches remain valid
- **AND** only render results are invalidated

#### Scenario: Cache technology

- **WHEN** the cache is implemented
- **THEN** it uses an in-process data structure owned by the application or
  pipeline
- **AND** no external cache library is introduced without a measured need

