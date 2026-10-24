# bundle-performance Specification

## Purpose
TBD - created by archiving change tech-debt-hardening. Update Purpose after archive.
## Requirements
### Requirement: Lazy renderer

p5 SHALL be loaded dynamically after the application shell is ready.

#### Scenario: Initial load

- **WHEN** the page loads
- **THEN** the initial HTML does not preload the p5 chunk
- **AND** the canvas appears once `renderer.readyPromise` resolves

#### Scenario: Renderer methods before load

- **WHEN** a renderer method is called before p5 resolves
- **THEN** it returns safely instead of throwing

### Requirement: Chunk budget

p5, CodeMirror, lil-gui and geometry vendors SHALL be emitted as named chunks,
and eager chunks SHALL stay below the 500 kB warning threshold.

#### Scenario: Production build

- **WHEN** `npm run build` runs
- **THEN** the app shell and eager vendors are below 500 kB each
- **AND** the lazy p5 chunk is documented as the only large chunk
