## ADDED Requirements

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
