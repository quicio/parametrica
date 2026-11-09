# preview-performance Specification

## Purpose
Measure and guard the optional WebGL/PBR product preview without changing the
prepared fabrication mesh or the technical renderer.
## Requirements
### Requirement: Lazy preview

The PBR dependency SHALL remain outside the initial bundle.

#### Scenario: Technical boot

- **WHEN** the app starts in Technical mode
- **THEN** Three.js and the product preview chunk are not loaded

#### Scenario: Product mode

- **WHEN** Product preview is selected
- **THEN** the lazy chunk loads
- **AND** the same prepared mesh is used

### Requirement: Performance evidence

The preview SHALL have measured frame and scene costs.

#### Scenario: Benchmark

- **WHEN** the benchmark runs
- **THEN** it records frame time, triangles, draw calls, shadow map, DPR and heap
- **AND** it covers 15/20/25 mm lattice meshes

#### Scenario: Hardware

- **WHEN** a hardware GPU is available
- **THEN** the same benchmark is recorded separately from software WebGL

### Requirement: Visual and fallback evidence

The preview SHALL prove it rendered and fall back cleanly.

#### Scenario: Visual

- **WHEN** the captured product image is inspected
- **THEN** it is non-empty and has material/shadow variance

#### Scenario: Failure

- **WHEN** WebGL is unavailable or the context is lost
- **THEN** the app falls back to p5 with a notice
- **AND** export and report state are unchanged

### Requirement: Degradation

The preview SHALL degrade before failing.

#### Scenario: Budget

- **WHEN** the preview exceeds its frame budget
- **THEN** it reduces preview quality or falls back
- **AND** reports the degradation

