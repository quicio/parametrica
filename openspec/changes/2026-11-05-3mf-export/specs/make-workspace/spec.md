## ADDED Requirements

### Requirement: Format selector

Fabricate SHALL offer STL and 3MF export formats.

#### Scenario: Default

- **WHEN** the user opens Fabricate
- **THEN** STL remains the default format

#### Scenario: 3MF

- **WHEN** the user selects 3MF and exports
- **THEN** the download uses the `.3mf` extension
- **AND** the report shows object and triangle counts

#### Scenario: Shared source

- **WHEN** the format changes
- **THEN** the selected bodies, repair, CSG and units settings are unchanged
