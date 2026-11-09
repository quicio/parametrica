## ADDED Requirements

### Requirement: Export adapter port

The exporter SHALL depend on an explicit export port, not on the App
composition object.

#### Scenario: Browser export

- **WHEN** SVG, PNG, GIF, STL, 3MF or JSON is exported
- **THEN** the exporter reads document, evaluation, renderer and fabrication
  state through the injected port
- **AND** composition supplies the port

#### Scenario: Tests

- **WHEN** a unit fixture provides the legacy plain context
- **THEN** the exporter normalizes it to the port shape
- **AND** output remains identical
