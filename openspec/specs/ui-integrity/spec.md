# ui-integrity Specification

## Purpose
Prevents the current product from exposing false controls, using the wrong
layer's analysis or silently omitting active render features during export.
## Requirements
### Requirement: Exposed controls are truthful

Every visible control affected by this change SHALL either produce its
observable effect or be removed/disabled with a visible reason.

#### Scenario: Blend control

- **WHEN** the blend control is visible
- **THEN** changing it changes the rendered layering
- **AND** the blend state does not leak into the next layer

#### Scenario: Blend control removed

- **WHEN** the renderer does not support blend modes
- **THEN** no blend control is presented as effective
- **AND** the document remains loadable

#### Scenario: Layer lock

- **WHEN** a layer is locked through a control that declares a content-lock
  scope
- **THEN** its generator, parameters, equations/harmonics, operators and style
  cannot be edited
- **AND** selection and visibility remain available
- **AND** the UI states the lock scope
- **AND** rename, reorder, delete and duplicate are not claimed as blocked
  unless the declared scope explicitly includes them

#### Scenario: Lock control removed

- **WHEN** no lock scope is approved or implemented
- **THEN** no layer lock is presented as effective

#### Scenario: Inapplicable render pass

- **WHEN** a render pass cannot operate on the visible geometry or generator
- **THEN** its control is disabled with a reason, or omitted when it would be
  meaningless
- **AND** it is not presented as an effective active pass

### Requirement: Layer-scoped diagnostic analysis

Diagnostic passes that operate per layer SHALL use the analysis of that
layer's curves.

#### Scenario: Second layer diagnostics

- **WHEN** a document has multiple layers and a tangents, normals or curvature
  pass is active
- **THEN** every layer's vectors are derived from that layer's curves
- **AND** no layer indexes another layer's analysis

#### Scenario: Combined overlay

- **WHEN** a global overlay is displayed
- **THEN** it may use combined scene analysis
- **AND** per-layer passes remain isolated

### Requirement: Export fidelity is explicit

Export SHALL either reproduce the active render features or state which
features are omitted.

#### Scenario: SVG omissions

- **WHEN** the active scene contains features the SVG exporter cannot represent
  (for example gradient wireframe, surface fill or overlays)
- **THEN** the user receives a visible notice listing the omitted features
- **AND** the export does not silently imply full fidelity

#### Scenario: PNG fidelity

- **WHEN** the user exports PNG
- **THEN** the raster reflects the active render scene
- **AND** reference-only underlays remain excluded from captured output

