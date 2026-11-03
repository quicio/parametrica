## ADDED Requirements

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
