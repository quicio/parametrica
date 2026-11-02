## Purpose

Expose explicit color metrics for Gradient Wireframe using the current color
ramp and palettes.

## ADDED Requirements

### Requirement: Color metric selection

The document SHALL expose `view.colorMetric` with `auto`, `height`, `radius`,
`curvature` and `arc`, defaulting to `auto`.

#### Scenario: Default

- **WHEN** an existing document loads
- **THEN** its gradient remains auto
- **AND** the current height/radius behavior is unchanged

#### Scenario: Sanitization

- **WHEN** an unknown metric is stored
- **THEN** it falls back to auto

### Requirement: Metric range and colors

Gradient Wireframe SHALL use the selected metric for bucketing and colors.

#### Scenario: Height and radius

- **WHEN** height or radius is selected
- **THEN** the ramp follows that value across all curves

#### Scenario: Curvature and arc length

- **WHEN** curvature or arc length is selected
- **THEN** the ramp follows the per-point metric
- **AND** curvature uses analysis while arc length uses cumulative length

### Requirement: UI and fidelity

Render SHALL expose the metric selector and keep ramp/palette independence.

#### Scenario: Change metric

- **WHEN** the user selects a metric
- **THEN** the canvas updates
- **AND** SVG Gradient Wireframe output uses the same metric colors

#### Scenario: Palette

- **WHEN** a palette is applied
- **THEN** the selected metric and ramp are unchanged
