## Purpose
Build organic lattice solids from the derived cellular network: curved
centerlines, variable radius, blended joints and controlled quality, while
preserving openings, envelope and fabrication validity.

## ADDED Requirements

### Requirement: Curved centerlines

Every network edge SHALL become a smooth centerline.

#### Scenario: Catmull-Rom

- **WHEN** an edge is converted
- **THEN** its control points are interpolated in surface coordinates
  `(θ,z)` or `(u,v)`
- **AND** the resulting samples are mapped to the surface
- **AND** the curve is deterministic

#### Scenario: Surface interpolation

- **WHEN** an implementation interpolates in 3D instead
- **THEN** samples are corrected/projected to the surface
- **AND** the maximum deviation is reported
- **AND** it stays within `surfaceTolerance`

#### Scenario: Seam

- **WHEN** an edge crosses the periodic seam
- **THEN** the angular coordinate is unwrapped to the shortest path
- **AND** the resulting samples do not jump across the seam

#### Scenario: Continuity

- **WHEN** two edges form a degree-2 chain
- **THEN** the shared node tangent is continuous
- **AND** no visible kink is introduced

#### Scenario: Adaptive sampling

- **WHEN** curvature or chord deviation requires it
- **THEN** the curve is sampled adaptively
- **AND** the sample count stays within budget

#### Scenario: Overshoot

- **WHEN** Catmull-Rom would overshoot the local neighborhood
- **THEN** tangents are clamped
- **AND** the deviation is reported or bounded

### Requirement: Variable strut section

Struts SHALL support a controlled radius profile.

#### Scenario: Constant

- **WHEN** the profile is `constant`
- **THEN** every ring uses the base radius

#### Scenario: Taper

- **WHEN** the profile is `taper`
- **THEN** the radius changes gradually along the edge
- **AND** the minimum is clamped

#### Scenario: Expression

- **WHEN** a safe radius expression is provided
- **THEN** it is evaluated per sample
- **AND** values outside `[min,max]` are clamped

#### Scenario: Minimum

- **WHEN** the requested radius is below the manufacturing minimum
- **THEN** the solid is rejected or reported
- **AND** it is not silently exported

### Requirement: Organic joints

The solid SHALL support selectable joint styles.

#### Scenario: Technical

- **WHEN** `jointStyle='technical'`
- **THEN** low-poly sphere joints are used

#### Scenario: Rounded

- **WHEN** `jointStyle='rounded'`
- **THEN** higher-resolution sphere joints are used

#### Scenario: Blend region

- **WHEN** `jointStyle='blend'`
- **THEN** a local region contains the incident segments up to
  `jointRadius + blendRadius + overlap`
- **AND** the method is localized; it is not a global SDF of the lattice

#### Scenario: Blend method

- **WHEN** the localized blend uses a signed-distance field
- **THEN** the first candidate is a local SDF + `Manifold.levelSet`
- **AND** the method is versioned and benchmarked before becoming the default
- **AND** `rounded` remains an available fallback

#### Scenario: Integration

- **WHEN** a local joint mesh is unioned with the struts
- **THEN** tube ends overlap the joint volume by at least `overlap`
- **AND** the union has no gaps or tangent-only contacts

#### Scenario: Auto

- **WHEN** `jointStyle='auto'`
- **THEN** the builder selects an allowed style by quality/budget
- **AND** the selection is reported

#### Scenario: Fallback

- **WHEN** a blend fails validation or would close an opening
- **THEN** the builder falls back to rounded
- **AND** the affected node, reason and fallback are reported
- **AND** no silent degradation occurs

### Requirement: Envelope and openings

The solid SHALL preserve the intended envelope and apertures.

#### Scenario: Centerline

- **WHEN** `envelope='centerline'`
- **THEN** the strut radius is centered on the network

#### Scenario: Outer

- **WHEN** `envelope='outer'`
- **THEN** the outer surface follows the nominal profile
- **AND** the outer dimension is within tolerance

#### Scenario: Openings

- **WHEN** the solid is built
- **THEN** each interior opening is checked with a gauge of width
  `minOpeningWidth`
- **AND** the gauge is a geometric test on the final solid
- **AND** violations are reported per cell/node
- **AND** the area is not used as the manufacturing criterion

### Requirement: Quality profiles

The builder SHALL expose draft, standard and high quality.

#### Scenario: Profiles

- **WHEN** the finish quality changes
- **THEN** curve samples, radial segments, joint style and blend resolution
  follow the profile
- **AND** the profile is separate from the repair/SDF quality

#### Scenario: Worker

- **WHEN** the report runs in the worker
- **THEN** the resolved finish quality travels in the serialized preparation
- **AND** the worker does not guess a different default

#### Scenario: Preview

- **WHEN** the solid is shown in preview
- **THEN** the source uses the selected finish quality
- **AND** only the display mesh may be simplified
- **AND** the preview cannot silently switch to a different profile

#### Scenario: Export

- **WHEN** the body is exported
- **THEN** the selected finish quality is used
- **AND** no silent quality upgrade occurs

#### Scenario: Budget

- **WHEN** a profile exceeds its time/triangle budget
- **THEN** it degrades or fails with a reason
- **AND** does not hang the UI

### Requirement: Fabrication validity

The organic solid SHALL be a valid fabrication body.

#### Scenario: Validation

- **WHEN** the solid is finalized
- **THEN** it is closed, manifold, oriented and has positive volume
- **AND** unreported self-intersections are not allowed
- **AND** the Manifold guarantee is not inherited after post-processing that
  changes topology

#### Scenario: Manufacturing

- **WHEN** the solid is checked
- **THEN** minimum strut, joint and opening width are reported
- **AND** overhang is reported
- **AND** the measurement source and quality profile are recorded

#### Scenario: Export

- **WHEN** the body is exported as STL/3MF
- **THEN** the full-resolution solid is used
- **AND** validation runs before writing

### Requirement: Solid provenance

The organic solid SHALL record enough provenance to reproduce and audit it.

#### Scenario: Result metadata

- **WHEN** a solid is produced
- **THEN** the result records `specHash`, `algorithmVersion`, `networkHash`,
  joint style, finish quality and fallback counts
- **AND** it does not claim cross-generation ID stability

#### Scenario: Audit

- **WHEN** a solid is re-generated with the same spec and quality
- **THEN** its mesh hash is identical
- **AND** a changed algorithm version is visible in the provenance

### Requirement: Organic example

Fabricate SHALL expose an organic lattice example without replacing the
technical baseline.

#### Scenario: Preset

- **WHEN** `Organic Lattice Vase 200` is loaded
- **THEN** it uses an organic joint style and the outer envelope
- **AND** the joint method is the one validated by the Phase 2 benchmark
- **AND** it is exportable in millimetres

#### Scenario: Baseline

- **WHEN** `Lattice Vase 200` is loaded
- **THEN** it keeps technical joints
- **AND** both presets remain independently selectable
