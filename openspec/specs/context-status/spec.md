# context-status Specification

## Purpose
Show the active layer, generator, visibility, operator count and projection in the panel status.
## Requirements
### Requirement: Active context

The panel SHALL show the active layer, its visibility, generator, operator
count and projection.

#### Scenario: Layer visibility

- **WHEN** the active layer is hidden
- **THEN** the status marks it hidden and offers a Show action

#### Scenario: Show action

- **WHEN** the user activates Show
- **THEN** the layer becomes visible and the warning clears

### Requirement: Dependency signals

The status SHALL indicate disabled operators, time-modulated parameters and
timeline tracks for the active layer.

#### Scenario: Modulated parameter

- **WHEN** a generator or operator parameter has a time expression
- **THEN** the status reports a non-zero modulation count

#### Scenario: Timeline track

- **WHEN** the active layer has timeline tracks
- **THEN** the status reports the track count
