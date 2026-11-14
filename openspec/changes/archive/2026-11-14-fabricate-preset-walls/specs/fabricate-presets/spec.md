## ADDED Requirements

### Requirement: Wall minimum for curated presets

Every Fabricate preset SHALL pass the wall check at its default profile.

#### Scenario: Preset loop

- **WHEN** the Node suite prepares every Fabricate preset
- **THEN** the wall check is `ok`
- **AND** no preset reports a failed wall

#### Scenario: Bud vase

- **WHEN** `Bud Vase 160` is prepared
- **THEN** its radial wall is 4 mm
- **AND** the sampled p5 meets the FDM minimum

#### Scenario: Capped catenoid

- **WHEN** `Cap Catenoid` is prepared
- **THEN** the ends turn inward so the caps are not acute overhangs
- **AND** the sampled p5 meets the FDM minimum

#### Scenario: Perforated vase

- **WHEN** `Perforated Vase 200` is prepared
- **THEN** it uses 32 mm cells, 8 mm struts and a 12 mm rim
- **AND** it keeps more than 50 through-holes
- **AND** the sampled p5 meets the FDM minimum

## MODIFIED Requirements

### Requirement: Decorative and abstract objects

Fabricate SHALL include decorative and abstract figures.

#### Scenario: Bud vase

- **WHEN** `Bud Vase 160` is loaded
- **THEN** it is a 160 mm tall hollow vase with a soft waist
- **AND** its radial wall is 4 mm

#### Scenario: Totem

- **WHEN** `Twisted Totem 220` is loaded
- **THEN** it is a 220 mm solid with a flat base
- **AND** it has a five-lobed twisted profile
