## ADDED Requirements

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
