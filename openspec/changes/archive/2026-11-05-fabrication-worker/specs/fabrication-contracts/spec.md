## ADDED Requirements

### Requirement: Cached fabrication result

Export SHALL use a completed worker result when available.

#### Scenario: Cached result

- **WHEN** a heavy job has completed
- **THEN** STL/3MF export uses that report
- **AND** the geometry is not recomputed on the main thread

#### Scenario: Running job

- **WHEN** export is requested while a heavy job is running
- **THEN** export is rejected with a clear reason
