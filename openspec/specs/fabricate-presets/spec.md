# fabricate-presets Specification

## Purpose
Provide curated built-in examples that make every Fabricate capability
discoverable without manual setup.
## Requirements
### Requirement: Fabricate category

The preset library SHALL include a Fabricate category.

#### Scenario: Browser

- **WHEN** the preset browser opens
- **THEN** a Fabricate category is visible
- **AND** its examples appear in the catalog

### Requirement: Ready solid

A Fabricate example SHALL open as a validated solid with a physical scale.

#### Scenario: Solid Torus

- **WHEN** the example is loaded
- **THEN** it has a millimetre scale
- **AND** Fabricate reports an exportable body

### Requirement: Multi-body and booleans

Examples SHALL demonstrate multi-body and boolean workflows.

#### Scenario: Twin Tori

- **WHEN** loaded
- **THEN** composition scope selects two bodies
- **AND** 3MF produces two objects

#### Scenario: Boolean

- **WHEN** a boolean example is loaded
- **THEN** the recipe is explicit
- **AND** Manifold produces one body

### Requirement: Repair examples

Examples SHALL demonstrate cap and SDF repair.

#### Scenario: Cap

- **WHEN** Cap Catenoid is loaded
- **THEN** Repair is enabled with automatic caps
- **AND** the result is exportable

#### Scenario: SDF

- **WHEN** SDF Enneper is loaded
- **THEN** self-intersections use Manifold SDF
- **AND** the result is exportable

### Requirement: Challenge example

At least one example SHALL demonstrate a real limitation.

#### Scenario: Möbius

- **WHEN** the non-orientable example is loaded
- **THEN** Fabricate remains blocked
- **AND** the reason and next action explain the limitation
- **AND** the preset is not misrepresented as exportable

### Requirement: No special mode switching

Loading an example SHALL NOT change the active workspace mode automatically.

#### Scenario: Mode

- **WHEN** an example is applied
- **THEN** the current mode is preserved
- **AND** the user can open Fabricate explicitly

### Requirement: Hollow vase example

Fabricate SHALL include a solid-wall hollow vase example.

#### Scenario: Dimensions

- **WHEN** `Solid Vase 200` is loaded
- **THEN** the body is about 200 mm tall and 175 mm wide
- **AND** the mouth is about 135 mm
- **AND** the radial wall is 2.5 mm

#### Scenario: Construction

- **WHEN** the preset is evaluated
- **THEN** outer and inner surfaces become closed solids
- **AND** Manifold difference produces a hollow shell

#### Scenario: Fabrication

- **WHEN** Fabricate opens the preset
- **THEN** the report is exportable in millimetres
- **AND** the body has positive volume and triangle count

### Requirement: No lattice yet

The vase example SHALL be a solid wall, not a perforated lattice.

#### Scenario: Scope

- **WHEN** the preset is used
- **THEN** the wall is continuous
- **AND** the lattice remains a future capability

