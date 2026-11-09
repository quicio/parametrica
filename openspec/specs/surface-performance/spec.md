# surface-performance Specification

## Purpose
Make dense surface interaction measurable and keep picking, seams and playback
from silently stalling the instrument.
## Requirements
### Requirement: Dense surface benchmark

The app SHALL provide a repeatable browser benchmark for dense surface scenes.

#### Scenario: Metrics

- **WHEN** the benchmark runs
- **THEN** it records scene build, picking, seam overlay and playback costs
- **AND** it records the scene size and viewport

### Requirement: Interaction guardrail

Dense interaction SHALL degrade before it blocks the UI.

#### Scenario: Slow scene

- **WHEN** a measured interaction exceeds the provisional budget
- **THEN** the app reduces optional overlays or preview detail
- **AND** reports the degradation

### Requirement: No geometry change

Optimization SHALL NOT change the canonical geometry or export.

#### Scenario: Export

- **WHEN** a benchmark scene is exported
- **THEN** the output uses the same geometry contracts as before

