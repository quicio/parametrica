## ADDED Requirements

### Requirement: Second object wave

Fabricate SHALL include functional and decorative objects beyond the first
wave.

#### Scenario: Lampshade

- **WHEN** `Lampshade 180` is loaded
- **THEN** it is an open annular shell with a 2 mm wall
- **AND** it is 180 mm tall and about 170 mm wide
- **AND** it has positive bed contact

#### Scenario: Candle holder

- **WHEN** `Candle Holder 80` is loaded
- **THEN** it has a tea-light recess and a deeper taper-candle hole
- **AND** the blind holes do not break through the floor

#### Scenario: Soap dish

- **WHEN** `Soap Dish 120` is loaded
- **THEN** it is a rounded 120 × 80 × 18 mm shell
- **AND** three through-slots drain the floor

#### Scenario: Desk tray

- **WHEN** `Desk Tray 160` is loaded
- **THEN** it is a rounded 160 × 90 × 25 mm shell
- **AND** a cable notch cuts the side wall

#### Scenario: Napkin holder

- **WHEN** `Napkin Holder 140` is loaded
- **THEN** it is a 140 × 70 × 60 mm shell
- **AND** front and back windows leave side posts

#### Scenario: Wall planter

- **WHEN** `Wall Planter 120` is loaded
- **THEN** it is a 140 × 70 × 120 mm shell
- **AND** a keyhole mount cuts the back wall
- **AND** a bottom drain cuts the floor

#### Scenario: Wall hook

- **WHEN** `Wall Hook 70` is loaded
- **THEN** it is a flanged peg with a 70 mm projection
- **AND** two screw holes pass through the flange
- **AND** it prints with the flange on the bed

### Requirement: Product preview for prepared solids

Product preview SHALL be available for every exportable prepared solid.

#### Scenario: Hollow object

- **WHEN** `Pencil Cup 100` is READY in Fabricate and 3D view
- **THEN** the Product renderer is enabled
- **AND** selecting Product loads the prepared mesh

#### Scenario: Cut object

- **WHEN** `Candle Holder 80` is READY in Fabricate and 3D view
- **THEN** Product preview uses the body after its blind-hole cutters
- **AND** the technical canvas is restored when returning to Technical
