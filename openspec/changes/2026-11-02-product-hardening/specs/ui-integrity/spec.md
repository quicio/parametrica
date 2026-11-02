## Purpose

Ensures that Parametrica's exposed controls are truthful, state scopes are
explicit, layer diagnostics stay layer-scoped, and export does not silently
diverge from the active render scene.

## ADDED Requirements

### Requirement: Exposed controls have an observable effect

Every visible control SHALL change the document, the rendered result or the
declared UI state. A control that cannot act SHALL be removed or disabled with
a visible reason.

#### Scenario: Blend control

- **WHEN** the user changes the blend control
- **THEN** the visible layering changes on the next frame
- **AND** the blend mode is reset before the next layer is drawn

#### Scenario: Unsupported control

- **WHEN** a feature is not implemented in the current renderer or geometry
- **THEN** its control is absent, disabled or labelled as unavailable
- **AND** the user is not led to believe it works

#### Scenario: Layer lock

- **WHEN** the UI exposes a layer lock
- **THEN** a locked layer cannot be mutated through generator, parameter,
  equation, operator, style, rename, reorder or delete controls
- **AND** unlocking is an explicit action
- **AND** visibility remains controllable separately

### Requirement: State scope is explicit

Controls SHALL make their scope clear: global canvas/document, active layer,
viewport, workspace or session.

#### Scenario: Global and layer controls

- **WHEN** the user edits a canvas, camera or workspace setting
- **THEN** the UI identifies it as global or contextual
- **AND** editing one layer's style does not change another layer's style

#### Scenario: Active-layer style

- **WHEN** the active layer changes
- **THEN** layer-scoped style controls show the newly active layer's values
- **AND** global canvas controls retain their values

### Requirement: Layer-scoped analysis

Diagnostic passes that operate per layer SHALL use the analysis of that
layer's curves.

#### Scenario: Second layer diagnostics

- **WHEN** a document has multiple layers and a tangents, normals or curvature
  pass is active
- **THEN** every layer's vectors are derived from that layer's curves
- **AND** no layer indexes another layer's analysis

#### Scenario: Combined overlays

- **WHEN** a global overlay is shown
- **THEN** it may use the combined scene analysis
- **AND** per-layer passes remain isolated

### Requirement: Render pass applicability

Render-pass controls SHALL reflect whether the pass can run on the current
geometry.

#### Scenario: Inapplicable pass

- **WHEN** a pass cannot operate on the visible geometry or generator
- **THEN** its control is disabled or hidden with a reason
- **AND** it is not presented as an active, effective pass

#### Scenario: Pass metadata

- **WHEN** passes are listed in the UI
- **THEN** they expose a user-facing group and description
- **AND** the active state remains truthful when geometry changes

### Requirement: Appearance customization is reachable

Settings already present in the document SHALL be editable from the UI.

#### Scenario: Gradient ramp

- **WHEN** the gradient wireframe pass is available
- **THEN** the user can edit its color ramp from the panel
- **AND** the ramp persists in the document

#### Scenario: Palette and ramp

- **WHEN** a palette declares a ramp and the user applies it
- **THEN** the ramp is updated consistently
- **AND** a palette without a ramp does not silently overwrite the current one

#### Scenario: Fill modes

- **WHEN** the user selects a fill mode
- **THEN** only modes supported by the renderer are offered
- **AND** the chosen mode is reflected in rendering and persistence

### Requirement: Export fidelity is explicit

Export SHALL either reproduce the active render features or state which
features are omitted.

#### Scenario: SVG omissions

- **WHEN** the active scene contains features the SVG exporter cannot
  represent
- **THEN** the user receives a visible notice listing the omissions
- **AND** the export does not silently imply full fidelity

#### Scenario: PNG fidelity

- **WHEN** the user exports PNG
- **THEN** the raster reflects the active render scene
- **AND** reference-only underlays remain excluded from captured output

### Requirement: Single authoritative stroke width

Stroke width SHALL have one authoritative stored value per layer.

#### Scenario: Width change

- **WHEN** the user changes the stroke width
- **THEN** rendering, SVG export and the style UI use the same value
- **AND** a legacy view-level width does not diverge from it

#### Scenario: Legacy document

- **WHEN** an older document contains only a view-level stroke width
- **THEN** it loads with that value applied to the active layer
- **AND** no document version migration is required

### Requirement: Reproducible exploration

Randomised exploration SHALL expose the seed that produced its candidates.

#### Scenario: Randomize

- **WHEN** the user runs randomisation
- **THEN** the seed is visible
- **AND** repeating it produces the same candidate set
- **AND** the user can request a new seed explicitly
