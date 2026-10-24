## Purpose

Let a piece contain several mathematical figures with independent generators,
operator stacks and styles, while keeping one serialisable, deterministic and
exportable document.

## ADDED Requirements

### Requirement: Document v3 with layers

The document SHALL support `version: 3` with `layers: Layer[]`, shared
`view`, shared `animation` and the schema defined in `design.md` §D5.

#### Scenario: Multiple layers

- **WHEN** a document has three layers
- **THEN** each layer has its own generator, operators, seed, visibility and
  style

#### Scenario: Shared view

- **WHEN** the user changes `view.strokeWeight` or the artboard
- **THEN** the change applies to the whole composition

### Requirement: Layer evaluation isolation

Layers SHALL evaluate independently. A failing layer SHALL produce an error
entry without preventing other layers from rendering.

#### Scenario: One broken layer

- **WHEN** layer 2 has an invalid expression and layer 1 is valid
- **THEN** layer 1 renders normally
- **AND** the error identifies layer 2

#### Scenario: Per-layer seed

- **WHEN** layer A uses seed 1 and layer B uses seed 4242
- **THEN** noise geometry differs per layer and remains deterministic

### Requirement: Render order and visibility

Layers SHALL render in array order, first layer behind. Invisible layers
SHALL be skipped by rendering and export but SHALL remain in the document.

#### Scenario: Reorder layers

- **WHEN** layer B moves before layer A
- **THEN** B draws behind A in canvas, SVG and PNG

#### Scenario: Hide a layer

- **WHEN** a layer is hidden
- **THEN** it is omitted from the canvas and exports
- **AND** toggling visibility does not delete its data

### Requirement: Per-layer style

Each layer SHALL support stroke color, width, opacity, cap, join, optional
fill and blend mode as defined in `design.md` §D5.

#### Scenario: Independent styles

- **WHEN** two layers have different colors and widths
- **THEN** both styles are visible in canvas and exports

#### Scenario: Opacity

- **WHEN** a layer opacity is set to `0.5`
- **THEN** the rendered and exported stroke uses 50% opacity

### Requirement: Artboard

The view SHALL support an artboard with width, height, background, margin and
crop. The default keeps the current square black artboard.

#### Scenario: Portrait artboard

- **WHEN** the artboard is `1080×1350` with background `#111111`
- **THEN** canvas, SVG and PNG use that aspect ratio and background

#### Scenario: Existing documents

- **WHEN** a v2 document without an artboard loads
- **THEN** it receives the default square artboard without visual regression

### Requirement: v2 migration

Loading a v2 document SHALL produce a valid v3 document with one layer that
preserves the generator, operators, seed, view and animation.

#### Scenario: Preset migration

- **WHEN** every built-in v2 preset is loaded
- **THEN** it evaluates to the same geometry as before migration
- **AND** its document version is 3

#### Scenario: Export round-trip

- **WHEN** a v3 document is exported to JSON and imported
- **THEN** the layers, styles and artboard round-trip identically

### Requirement: Aggregated descriptor

With multiple layers, the figure descriptor SHALL aggregate layer metrics as
specified in `design.md` §D5 and SHALL expose per-layer descriptors.

#### Scenario: Summed metrics

- **WHEN** two layers produce two curves
- **THEN** `curveCount` equals the sum of layer curves
- **AND** `area` and `perimeter` are summed
- **AND** `layers` contains one descriptor per layer

### Requirement: Faithful export

SVG and PNG export SHALL reproduce layer order, visibility, style, artboard
and background.

#### Scenario: Styled SVG

- **WHEN** a two-layer document is exported as SVG
- **THEN** each visible layer is represented with its own stroke/fill style
- **AND** the background rect uses the artboard background

#### Scenario: Hidden layer omitted

- **WHEN** a layer is hidden
- **THEN** no element for that layer appears in the exported SVG
