# perforated-wall Specification

## Purpose
Subtract seeded radial through-holes from a closed shell to create an
openwork wall while preserving the solid floor and rim.
## Requirements
### Requirement: Seeded through-holes

The perforated mode SHALL subtract seeded radial holes from a closed shell.

#### Scenario: Hole pattern

- **WHEN** the cutout mode is enabled
- **THEN** holes come from the same deterministic Voronoi seeds
- **AND** each hole is a radial cylinder of `(cell − strut) / 2` radius

#### Scenario: Preserved ends

- **WHEN** the holes are generated
- **THEN** the floor and the rim stay solid
- **AND** the shell height stays 200 mm

#### Scenario: Subtraction

- **WHEN** the cutters are applied
- **THEN** Manifold subtracts them in one difference
- **AND** the result is closed, manifold and has positive volume

### Requirement: Perforated example

Fabricate SHALL include a perforated vase example.

#### Scenario: Preset

- **WHEN** `Perforated Vase 200` is loaded
- **THEN** it uses the closed shell and the cutout mode
- **AND** it is exportable in millimetres
- **AND** it reports its hole count and diameter

#### Scenario: Preview

- **WHEN** the report is ready and preview is Solid
- **THEN** the prepared perforated shell is shown
- **AND** Authored shows the closed shell

