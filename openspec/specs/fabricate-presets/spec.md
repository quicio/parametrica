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

### Requirement: Upright vase presentation

The hollow vase example SHALL stand with its height on the vertical Z axis and
its mouth at the top of the 3D view.

#### Scenario: Height axis

- **WHEN** `Solid Vase 200` is loaded
- **THEN** its 200 mm height runs along Z
- **AND** the mouth is at the high-Z end

#### Scenario: Starting view

- **WHEN** the preset opens in the 3D view
- **THEN** the camera shows the mouth above the base

#### Scenario: Symmetry

- **WHEN** the vase is viewed from any horizontal direction
- **THEN** every cross-section is circular around Z
- **AND** the front and side silhouettes match

#### Scenario: Mouth

- **WHEN** the top row of the vase is measured
- **THEN** the mouth diameter is about 135 mm

#### Scenario: Export orientation

- **WHEN** the vase is exported to STL or 3MF
- **THEN** its height stays on Z
- **AND** a slicer can stand it on the bed without rotating it

### Requirement: Solid and lattice examples are separate

`Solid Vase 200` SHALL remain a continuous solid wall, while
`Lattice Vase 200` SHALL provide the openwork variant.

#### Scenario: Solid

- **WHEN** `Solid Vase 200` is used
- **THEN** the wall is continuous
- **AND** the lattice preparation is off

#### Scenario: Lattice

- **WHEN** `Lattice Vase 200` is used
- **THEN** its wall is the cellular strut network
- **AND** both examples remain independently selectable

### Requirement: Exportable library

Every Fabricate preset SHALL be an exportable solid at its default settings.

#### Scenario: Report

- **WHEN** a Fabricate preset is prepared
- **THEN** the report is exportable
- **AND** the body has positive volume and triangles

#### Scenario: Object preset

- **WHEN** a functional or decorative object preset is prepared
- **THEN** bed contact is greater than zero
- **AND** the overhang ratio is below 20%

#### Scenario: Technical solid

- **WHEN** a torus or boolean demo needs supports
- **THEN** the report surfaces the missing bed contact and overhang
- **AND** the preset is not misrepresented as support-free

#### Scenario: Category

- **WHEN** the preset browser opens the Fabricate category
- **THEN** every entry is an object or a closed technical solid
- **AND** no entry is intentionally non-exportable

### Requirement: Functional objects

Fabricate SHALL include everyday functional objects.

#### Scenario: Pencil cup

- **WHEN** `Pencil Cup 100` is loaded
- **THEN** it is a 100 mm tall hollow cup with a flat base
- **AND** its wall is 3 mm

#### Scenario: Planter

- **WHEN** `Planter 120` is loaded
- **THEN** it is a 120 mm tall hollow pot with a 4 mm wall
- **AND** it has a flat foot

#### Scenario: Table objects

- **WHEN** `Napkin Ring 50` or `Coaster 90` is loaded
- **THEN** the napkin ring is a 3 mm through-wall ring
- **AND** the coaster is a 6 mm solid disc

### Requirement: Decorative and abstract objects

Fabricate SHALL include decorative and abstract figures.

#### Scenario: Bud vase

- **WHEN** `Bud Vase 160` is loaded
- **THEN** it is a 160 mm tall hollow vase with a soft waist
- **AND** its wall is 2.5 mm

#### Scenario: Totem

- **WHEN** `Twisted Totem 220` is loaded
- **THEN** it is a 220 mm tall solid with a flat base
- **AND** it has a five-lobed twisted profile

