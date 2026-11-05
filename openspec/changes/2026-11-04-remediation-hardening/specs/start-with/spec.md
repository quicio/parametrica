## ADDED Requirements

### Requirement: Replacement confirmation

A manual New Document choice SHALL confirm before replacing the current
document.

#### Scenario: Manual choice

- **WHEN** the user chooses a card from a manual New Document overlay
- **THEN** a confirmation is shown
- **AND** cancel keeps the current document and the overlay
- **AND** accept applies the chosen document

#### Scenario: First run

- **WHEN** the overlay is the first-run chooser
- **THEN** choosing a card does not ask for confirmation
