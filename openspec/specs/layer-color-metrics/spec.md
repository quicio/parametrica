# layer-color-metrics Specification

## Purpose
Allow each layer to choose its own Gradient Wireframe color metric while
inheriting the global value by default.
## Requirements
### Requirement: Layer metric inheritance

A layer SHALL optionally override `view.colorMetric`.

#### Scenario: Inherit

- **WHEN** `layer.colorMetric` is null
- **THEN** the layer uses the global metric
- **AND** old documents render unchanged

#### Scenario: Override

- **WHEN** a layer sets a valid metric
- **THEN** only that layer uses it
- **AND** the global metric remains unchanged

### Requirement: Canvas and SVG

The layer metric SHALL drive Gradient Wireframe in both outputs.

#### Scenario: Canvas

- **WHEN** the layer metric is curvature
- **THEN** that layer colors by curvature

#### Scenario: SVG

- **WHEN** the layer metric is set
- **THEN** the SVG gradient pass for that layer uses the same metric colors

### Requirement: UI

Style SHALL expose Global plus the available metrics.

#### Scenario: Global

- **WHEN** the user selects Global
- **THEN** `layer.colorMetric` is cleared
- **AND** the global metric applies

#### Scenario: Content lock

- **WHEN** the layer is locked
- **THEN** the Color metric control is disabled

