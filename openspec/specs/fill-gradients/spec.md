# fill-gradients Specification

## Purpose
Add configurable linear and radial gradient fills to the active layer and
export them faithfully to SVG.
## Requirements
### Requirement: Fill gradient model

The document SHALL expose `style.fill.gradient` with enabled, type, direction,
radial geometry and 2–4 color stops. Missing or invalid values SHALL fall back
to a disabled gradient so existing documents remain valid.

#### Scenario: Default document

- **WHEN** a document has only a solid fill
- **THEN** `fill.gradient.enabled` is false
- **AND** the solid color and opacity remain unchanged

#### Scenario: Round-trip

- **WHEN** a document with a linear or radial gradient is exported and
  re-imported
- **THEN** its type, angle/center/radius and stops are preserved

### Requirement: Linear and radial rendering

Closed curve fills and Surface Fill SHALL use the gradient when enabled.

#### Scenario: Linear direction

- **WHEN** a linear gradient is enabled with an angle
- **THEN** the canvas fill direction follows that angle across the layer bbox
- **AND** changing the angle changes the rendered result

#### Scenario: Radial geometry

- **WHEN** a radial gradient is enabled
- **THEN** its center and radius follow the active layer bbox
- **AND** Fill opacity applies without changing stroke opacity

#### Scenario: Surface Fill

- **WHEN** Surface Fill is active with a gradient
- **THEN** mesh faces use the same gradient
- **AND** painter order and per-face depth alpha remain visible

### Requirement: Style controls

Style SHALL expose fill type, linear angle, radial center/radius and gradient
stops.

#### Scenario: Choose a gradient

- **WHEN** the user selects Linear or Radial
- **THEN** Fill is enabled and the gradient controls become available
- **AND** the canvas updates

#### Scenario: Content lock

- **WHEN** the active layer is content-locked
- **THEN** gradient controls are disabled with the rest of the style controls

### Requirement: SVG fill fidelity

SVG SHALL export gradient fills with equivalent definitions and paint.

#### Scenario: Linear SVG

- **WHEN** a linear fill gradient is exported
- **THEN** SVG contains a `<linearGradient>` with the same stops
- **AND** the filled paths use `fill="url(#…)"`

#### Scenario: Radial SVG

- **WHEN** a radial fill gradient is exported
- **THEN** SVG contains a `<radialGradient>` with matching center/radius
- **AND** fill opacity is preserved

#### Scenario: No gradient

- **WHEN** the fill is solid or disabled
- **THEN** SVG keeps the existing solid/none fill behavior
- **AND** no unused gradient definition is emitted

