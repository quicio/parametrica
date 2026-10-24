## Purpose

Turn a single mathematical form into a composed piece with independent
layers, styles and deterministic export.

## ADDED Requirements

### Requirement: Document v3 layers

The document SHALL support version 3 with ordered layers, each carrying its
own generator, operators, seed and style.

#### Scenario: Three-layer composition

- **WHEN** three layers are added
- **THEN** each has independent generator/operator parameters and style

#### Scenario: v2 migration

- **WHEN** a v2 preset loads
- **THEN** it becomes one layer with the same geometry

### Requirement: Layer evaluation isolation

Each layer SHALL evaluate independently and a failing layer SHALL not prevent
others from rendering.

#### Scenario: One invalid layer

- **WHEN** layer 2 has an invalid expression
- **THEN** layer 1 still renders and the error identifies layer 2

### Requirement: Layer operations

The UI SHALL support add, remove, duplicate, reorder, hide and lock.

#### Scenario: Reorder

- **WHEN** layer B moves before A
- **THEN** the rendered and exported order changes

#### Scenario: Hidden layer

- **WHEN** a layer is hidden
- **THEN** it is omitted from canvas and export but remains in the document

### Requirement: Per-layer style

Each layer SHALL use its own stroke/fill/opacity/blend style.

#### Scenario: Different styles

- **WHEN** two layers use different colors
- **THEN** both colors appear in canvas and SVG

### Requirement: Aggregate descriptor

The descriptor SHALL aggregate layers and expose one descriptor per layer.

#### Scenario: Aggregated metrics

- **WHEN** two layers contribute curves
- **THEN** curve/point counts and area/perimeter aggregate
- **AND** `layers` has two entries

### Requirement: Export fidelity

SVG/PNG SHALL preserve layer order, visibility and style.

#### Scenario: Hidden layer omitted

- **WHEN** a layer is hidden
- **THEN** no SVG element for that layer is emitted
