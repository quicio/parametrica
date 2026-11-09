## REMOVED Requirements

### Requirement: Repair examples

**Reason**: The thin SDF Enneper repair demo was removed from the Fabricate
category because it is not a reliable print. Cap Catenoid still demonstrates
repair and caps.

### Requirement: Challenge example

**Reason**: An intentionally non-exportable challenge does not belong in a
library whose label is Fabricate. The Möbius limitation stays documented in the
geometry contracts, not as a selectable preset.

## ADDED Requirements

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
