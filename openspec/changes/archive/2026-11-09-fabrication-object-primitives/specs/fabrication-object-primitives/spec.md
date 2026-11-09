## Purpose

Define reusable construction primitives for Fabricate object presets without
changing the geometry contracts or the canonical vases.

## ADDED Requirements

### Requirement: Rounded shell

Presets SHALL be able to build a hollow rounded rectangular body.

#### Scenario: Construction

- **WHEN** a rounded shell is built
- **THEN** outer and inner cross-sections are superellipses
- **AND** the inner shell is offset by the wall thickness
- **AND** the floor is solid below the inner cavity

#### Scenario: Result

- **WHEN** the shell is prepared
- **THEN** it is one closed exportable body
- **AND** it has a flat base and an open top

### Requirement: Cutter layers

Construction geometry SHALL be usable by Fabricate without appearing in the
technical render.

#### Scenario: Difference

- **WHEN** a preset contains `fabricationRole: "cutter"` layers
- **THEN** the difference operation subtracts every cutter from the shell
- **AND** the resulting body is closed

#### Scenario: Render exclusion

- **WHEN** the technical scene is built
- **THEN** cutter layers are omitted
- **AND** SVG export does not contain cutter geometry

### Requirement: Open and stepped solids

The primitives SHALL cover open annular shells and stepped solids of
revolution.

#### Scenario: Annular shell

- **WHEN** an open annular shell is prepared
- **THEN** it has a through centre
- **AND** it is closed by annular end caps
- **AND** it has positive bed contact

#### Scenario: Stepped solid

- **WHEN** a stepped solid is prepared
- **THEN** blind holes are cut without breaking through the floor
- **AND** the body remains exportable and print-ready
