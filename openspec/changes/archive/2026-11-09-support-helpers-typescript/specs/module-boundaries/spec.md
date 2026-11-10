## ADDED Requirements

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
