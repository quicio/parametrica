# engine-safety Specification

## Purpose
The engine must be deterministic, bounded and diagnosable. Stage caches
must invalidate when any input changes, modulated values must obey the
schema, no stage output may propagate unbounded geometry, and equation
errors must identify the field that caused them.
## Requirements
### Requirement: Seed-aware stage cache

The stage cache signature SHALL include `document.seed`, the evaluation
time and the quality options in addition to the stage id, params, mods,
enabled flag and camera.

#### Scenario: Seed change invalidates noise geometry

- **WHEN** a document whose `x(t)` contains `noise(t)` is evaluated with
  seed 1 and then re-evaluated with seed 4242
- **THEN** at least one output point differs between the two results

#### Scenario: Same seed is deterministic

- **WHEN** the same document and seed are evaluated twice with the cache
  cleared between runs
- **THEN** every point is identical

### Requirement: Modulated values are schema-clamped

Every numeric value produced by a modulation expression or an
`{ expr }` AnimatableValue SHALL be clamped to `[min, max]` and snapped
to `step` before reaching a generator or operator.

#### Scenario: Samples cannot escape the schema

- **WHEN** `samples` has schema max 8 000 and a modulation returns
  50 000 with `adaptive = false`
- **THEN** the generator receives 8 000 and the output never exceeds
  8 000 points

#### Scenario: Non-finite modulation is keyed

- **WHEN** a modulation evaluates to a non-finite number
- **THEN** an error with the parameter key is reported and the schema
  default is used

### Requirement: Point budgets apply after every stage

After each generator/operator stage, the engine SHALL enforce
`MAX_POINTS_PER_CURVE = 50 000` and `MAX_TOTAL_POINTS = 200 000`.
The evaluation result SHALL expose `stats.peakPoints`, the maximum
total point count observed at any stage boundary (after decimation).

#### Scenario: Topology repeat cannot explode

- **WHEN** a 20 000-point attractor passes through `radial-repeat`
  with `count = 48`
- **THEN** `stats.peakPoints <= 200 000`
- **AND** the final `stats.pointCount <= 200 000`
- **AND** evaluation completes without exhausting memory

### Requirement: Lazy differential analysis

`evaluateDocument` SHALL compute `stats.pointCount`, `stats.arcLength`
and `bbox` eagerly, but SHALL compute per-curve tangents, normals,
curvature and inflections only when `result.analysis` is read.
`stats.analysisMs` SHALL be `0` before the first access.

#### Scenario: Geometry-only consumers avoid analysis

- **WHEN** a consumer reads only `curves`, `stats` and `bbox`
- **THEN** `stats.analysisMs === 0`
- **AND** accessing `analysis` afterwards sets a finite
  `stats.analysisMs >= 0`

#### Scenario: Render passes that need analysis still get it

- **WHEN** the `curvature` render pass is active
- **THEN** the renderer reads a populated `analysis.perCurve` array

### Requirement: Keyed generator errors

Generator expression errors SHALL carry the schema key of the failing
field. `Controls.showErrors` SHALL mark the matching ExpressionField,
and telemetry SHALL show the first error message.

#### Scenario: Invalid x(t) marks the field

- **WHEN** `exprX = 'sin(3*t'`
- **THEN** `evaluation.errors[0].key === 'exprX'`
- **AND** the x(t) editor has class `has-error`
- **AND** telemetry contains `Expected ")"`

#### Scenario: Invalid `r(θ)` marks the field

- **WHEN** `exprR` is syntactically invalid
- **THEN** `evaluation.errors[0].key === 'exprR'`
