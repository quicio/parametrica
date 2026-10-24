# artboard-style-panel Specification

## Purpose
Give the current single-layer figure an explicit artboard and visual style so
discoveries can be presented and exported faithfully.
## Requirements
### Requirement: Artboard model

The document SHALL expose `view.artboard` with width, height, background and
margin, sanitized to the ranges in the design.

#### Scenario: Default artboard

- **WHEN** a document without an artboard loads
- **THEN** it uses `900×900`, black background and zero margin

#### Scenario: Portrait artboard

- **WHEN** the user selects portrait 4:5
- **THEN** canvas and export use `1080×1350`

### Requirement: Style model

The document SHALL expose `view.style` with stroke color/width/opacity/cap/
join, optional fill and blend.

#### Scenario: Style round-trip

- **WHEN** a styled document is exported to JSON and imported
- **THEN** its artboard and style values are identical

#### Scenario: Legacy compatibility

- **WHEN** an old document has only `view.strokeWeight`
- **THEN** it renders with the default white stroke at that width

### Requirement: Canvas fidelity

The canvas SHALL render the artboard background, aspect ratio and style.

#### Scenario: Canvas background

- **WHEN** the artboard background is `#111111`
- **THEN** the canvas field is `#111111`

#### Scenario: Letterboxing

- **WHEN** the artboard is portrait inside a wide container
- **THEN** the composition is centered without distorting geometry

### Requirement: Export fidelity

SVG and PNG SHALL reproduce the artboard and visible style.

#### Scenario: Styled SVG

- **WHEN** the stroke is red with 50% opacity
- **THEN** the exported path uses red and `stroke-opacity="0.5"`

#### Scenario: Export dimensions

- **WHEN** the artboard is `1080×1350`
- **THEN** the SVG/PNG dimensions match

### Requirement: Palette presets

The panel SHALL offer curated palettes that write explicit artboard/style
values into the document.

#### Scenario: Apply a palette

- **WHEN** the user selects “Paper”
- **THEN** the background and stroke colors change
- **AND** the document can be exported without the palette data

### Requirement: Non-regression

Existing presets and render passes SHALL keep working with the new style
system.

#### Scenario: Existing preset

- **WHEN** a built-in preset is loaded
- **THEN** its geometry is unchanged and it receives the default artboard/style
