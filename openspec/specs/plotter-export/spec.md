# plotter-export Specification

## Purpose
Produce a stroke-only SVG suitable for pen plotters, independent of active
fills, gradients, blends, overlays and diagnostic render passes.
## Requirements
### Requirement: Stroke-only output

The plotter SVG SHALL contain only visible curve stroke geometry.

#### Scenario: Filled and gradient scene

- **WHEN** the active document has fills, gradients, blend or overlays
- **THEN** the plotter SVG contains no fill, gradient, blend or overlay elements
- **AND** every curve is emitted as `fill="none"`

#### Scenario: Closed curves

- **WHEN** a curve is closed
- **THEN** its path ends with `Z`
- **AND** its coordinates are finite

### Requirement: Layer order and line attributes

The plotter SVG SHALL preserve visible layer order and stroke attributes.

#### Scenario: Multiple layers

- **WHEN** two layers are visible
- **THEN** their path groups appear in document order
- **AND** hidden layers are omitted
- **AND** stroke color, width, opacity, cap and join are preserved

### Requirement: Artboard and reproducibility

The plotter SVG SHALL use the artboard viewBox and embed the Parametrica
document, with no background fill.

#### Scenario: Export

- **WHEN** the plotter SVG is exported
- **THEN** its viewBox matches the artboard
- **AND** no background rectangle is emitted
- **AND** the document comment is present

### Requirement: No render-pass leakage

Active render modes and diagnostics SHALL NOT change plotter geometry.

#### Scenario: Diagnostics active

- **WHEN** gradient wireframe, tangents or overlays are active
- **THEN** the plotter SVG still contains only the base curve strokes
- **AND** no diagnostic pass group appears

### Requirement: Physical plotter page

Plotter export SHALL optionally declare physical page units.

#### Scenario: Physical page

- **WHEN** artboard physical units are configured
- **THEN** plotter output declares physical width/height
- **AND** the artboard viewBox remains stable

#### Scenario: Unitless page

- **WHEN** artboard units are unitless
- **THEN** plotter output remains unchanged
- **AND** no millimetre claim is emitted

