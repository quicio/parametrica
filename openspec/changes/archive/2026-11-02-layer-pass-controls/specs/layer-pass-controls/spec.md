## Purpose

Allow per-layer render-pass overrides and per-pass opacity while retaining
global defaults and existing pass behavior.

## ADDED Requirements

### Requirement: Per-layer render modes

A layer SHALL optionally override the global render-pass list.

#### Scenario: Inherit

- **WHEN** a layer has no custom mode list
- **THEN** it uses `view.modes`
- **AND** old documents render unchanged

#### Scenario: Custom list

- **WHEN** a layer has a custom mode list
- **THEN** only that layer uses it
- **AND** other layers keep the global list
- **AND** an empty custom list is explicit

### Requirement: Per-pass opacity

`view.passOpacity` SHALL apply a 0..1 multiplier to a pass.

#### Scenario: Canvas

- **WHEN** a pass opacity is below 1
- **THEN** the canvas pass is drawn with that opacity

#### Scenario: SVG

- **WHEN** a pass opacity is below 1
- **THEN** its SVG pass group carries the matching opacity

#### Scenario: Default

- **WHEN** no opacity is stored for a pass
- **THEN** it renders at full opacity

### Requirement: UI and compatibility

Style SHALL expose the layer override and Render the opacity controls.

#### Scenario: Override UI

- **WHEN** the user selects Custom in Style
- **THEN** the active layer receives a pass checkbox list
- **AND** selecting Global removes the override

#### Scenario: Analysis

- **WHEN** a layer override includes analysis-dependent passes
- **THEN** analysis is derived from the layer's effective modes

#### Scenario: Existing documents

- **WHEN** a document has no `layer.modes` or `passOpacity`
- **THEN** it evaluates and exports exactly as before
