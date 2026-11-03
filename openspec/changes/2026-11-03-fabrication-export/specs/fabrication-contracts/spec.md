## ADDED Requirements

### Requirement: STL exporter gate

STL export SHALL be a geometry consumer with an explicit validation gate.

#### Scenario: Validation before output

- **WHEN** an STL exporter is invoked
- **THEN** fabrication validation runs first
- **AND** invalid geometry produces no partial file

#### Scenario: Unit declaration

- **WHEN** a file is produced
- **THEN** the surrounding export metadata declares the physical unit/scale
- **AND** STL itself is not misrepresented as carrying a unit field
