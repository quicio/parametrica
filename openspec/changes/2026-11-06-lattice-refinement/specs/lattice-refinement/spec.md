## Purpose

Define a measured, adaptive refinement contract for organic lattice solids so
curve resolution, surface adherence, opening validation and performance budgets
are explicit and auditable rather than implied by a fixed sample count.

## ADDED Requirements

### Requirement: Derived refinement contract

The lattice geometry layer SHALL derive a normalized `RefinementSpec` from the
finish profile and the lattice configuration.

#### Scenario: Normalization

- **WHEN** a lattice solid is prepared
- **THEN** the refinement spec carries frame, method, tolerance, sample bounds,
  opening validation mode and budget
- **AND** numeric values are clamped
- **AND** the spec is derived, not written to the document

#### Scenario: Provenance

- **WHEN** a solid is produced
- **THEN** the result records the resolved refinement parameters, measured
  maxima and the algorithm version
- **AND** the mesh hash is reproducible for the same inputs

### Requirement: Adaptive centerline sampling

Centerlines SHALL be refined by deterministic deviation rather than a fixed
sample count per segment.

#### Scenario: Subdivision

- **WHEN** a segment exceeds the configured chord deviation
- **THEN** it is split
- **AND** the largest deviation is split first
- **AND** ties are resolved by stable segment order

#### Scenario: Budget

- **WHEN** the sample or point budget is reached
- **THEN** refinement stops deterministically
- **AND** the residual maximum deviation is reported
- **AND** the builder does not silently change topology

#### Scenario: Topology preservation

- **WHEN** refinement inserts samples
- **THEN** node, edge and cell ids are unchanged
- **AND** only the centerline sample list changes

### Requirement: Surface adherence

Refined samples SHALL be mapped through the same surface profile as the network.

#### Scenario: Surface coordinates

- **WHEN** an edge is refined
- **THEN** interpolation happens in `(θ,z)` or `(u,v)`
- **AND** the seam is unwrapped before mapping
- **AND** the maximum surface deviation is measured and reported

#### Scenario: Missing profile

- **WHEN** the surface profile is unavailable
- **THEN** the builder falls back to polyline
- **AND** the result reports `curveFallback: true`
- **AND** it does not claim an organic surface curve

### Requirement: Opening preservation and gauge

Refinement SHALL NOT hide or close openings, and the report SHALL distinguish
measured capsule results from cheaper estimates.

#### Scenario: Capsule gauge

- **WHEN** the solid is validated
- **THEN** a capsule of diameter `minOpeningWidth` is tested through each
  selected interior opening
- **AND** the capsule is oriented by the local surface normal
- **AND** the result reports checked, skipped and violating cells

#### Scenario: Estimate mode

- **WHEN** the capsule gauge is not run
- **THEN** any point-clearance result is labelled `estimate`
- **AND** it is not presented as a manufacturing guarantee

#### Scenario: Draft budget

- **WHEN** the finish profile is `draft`
- **THEN** a deterministic subset of interior cells may be checked
- **AND** the report states the subset size and the skipped cells

### Requirement: Measured quality budgets

Finish profiles SHALL map to refinement caps and SHALL record measured cost.

#### Scenario: Profile mapping

- **WHEN** the user selects `draft`, `standard` or `high`
- **THEN** curve caps, radial segments, joint slices and gauge coverage follow
  that profile
- **AND** the selected profile is the one used by the worker and export

#### Scenario: Measurements

- **WHEN** a solid is built
- **THEN** points, triangles, build time and gauge time are recorded
- **AND** the values are reported as measurements, not guarantees

#### Scenario: No silent upgrade

- **WHEN** a preview or export runs
- **THEN** it does not silently switch to a higher finish profile
- **AND** any quality override is reported

### Requirement: Refinement evidence

Refinement thresholds SHALL be backed by benchmark evidence before becoming
hard gates.

#### Scenario: Size matrix

- **WHEN** the benchmark runs
- **THEN** it covers 15, 20 and 25 mm cells on `Lattice Vase 200` and
  `Organic Lattice Vase 200`
- **AND** it records geometry, timing and opening results

#### Scenario: Provisional thresholds

- **WHEN** a threshold has not been measured on the real presets
- **THEN** the documentation marks it as provisional
- **AND** the implementation does not reject the preset solely because of it

### Requirement: Joint method decision gate

A local SDF joint SHALL remain a benchmark candidate until it satisfies the
quality and cost gates.

#### Scenario: Candidate

- **WHEN** local SDF joints are evaluated
- **THEN** the benchmark checks manifold validity, opening preservation,
  determinism, budget and visual quality against `rounded`

#### Scenario: Default

- **WHEN** the candidate fails any gate
- **THEN** `rounded` remains the production fallback
- **AND** the requested style, actual method and fallback reason are reported
