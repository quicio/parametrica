## Purpose

Give the user a compact, always-available observation surface: what the
current figure measures, which parameters influence it, and what each
parameter means, without requiring devtools or an AI provider.

## ADDED Requirements

### Requirement: Parameter documentation is visible

Every numeric, boolean, select and expression parameter with a schema `doc`
SHALL expose that text through the controller tooltip (and accessible
description). Expression fields SHALL expose it on the label tooltip.

#### Scenario: Slider documentation

- **WHEN** the user hovers `t min` on the Parametric generator
- **THEN** the controller title contains the schema documentation for `t0`

#### Scenario: Expression documentation

- **WHEN** the user hovers the `x(t)` label
- **THEN** the label title contains the expression documentation

### Requirement: Analysis panel metrics

The Analysis section SHALL display the current figure's descriptor metrics:
curve count, point count, bbox aspect, area, perimeter, compactness,
symmetry, curvature entropy, inflections, crossings, coverage, turning
number and fractal dimension.

#### Scenario: Metrics after evaluation

- **WHEN** a valid document is evaluated
- **THEN** the panel shows all metrics with finite numeric values

#### Scenario: Empty result

- **WHEN** evaluation produces no curves
- **THEN** the panel shows an empty state instead of `NaN`

### Requirement: Sensitivity panel

The Analysis section SHALL show a ranked list of the most influential numeric
parameters with their current value, impact and direction.

#### Scenario: Ranked influence

- **WHEN** the user activates “Analyze influence”
- **THEN** the list is sorted by impact descending
- **AND** each row names the stage and parameter path

#### Scenario: No numeric parameters

- **WHEN** the document has no numeric form parameters
- **THEN** the panel says there is nothing to rank

### Requirement: Analysis refresh

The panel SHALL refresh metrics automatically after a stable commit
(300 ms) and SHALL run sensitivity only on explicit request.

#### Scenario: Stable commit refresh

- **WHEN** the user stops moving a slider for 300 ms
- **THEN** the metric values reflect the new figure

#### Scenario: Animation does not trigger analysis

- **WHEN** animation is playing
- **THEN** automatic analysis does not run on every frame

#### Scenario: Explicit full analysis

- **WHEN** the user clicks “Analyze influence”
- **THEN** the panel runs descriptor plus sensitivity and reports completion

### Requirement: Failure isolation

Descriptor or sensitivity failures SHALL be caught and displayed in the
panel; they SHALL NOT break the canvas or the rest of the control panel.

#### Scenario: Analysis error

- **WHEN** the descriptor throws unexpectedly
- **THEN** the panel shows an error status
- **AND** the figure remains rendered

### Requirement: Accessibility and formatting

The Analysis section SHALL use semantic headings, live status updates and
human-readable units (px, px², percentages) without losing raw values.

#### Scenario: Screen-reader status

- **WHEN** analysis completes
- **THEN** a live region announces the updated state

#### Scenario: Unit formatting

- **WHEN** area and coverage are displayed
- **THEN** area is shown with an area unit and coverage as a percentage
