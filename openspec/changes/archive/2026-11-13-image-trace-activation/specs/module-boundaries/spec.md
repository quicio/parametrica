## ADDED Requirements

### Requirement: Single typed image tracing implementation

The image tracing pipeline SHALL have one implementation, `input/imageTrace.ts`.

#### Scenario: Import

- **WHEN** UI, tests or e2e import `input/imageTrace.js`
- **THEN** the path re-exports the typed module
- **AND** tracing math, limits and output are unchanged
