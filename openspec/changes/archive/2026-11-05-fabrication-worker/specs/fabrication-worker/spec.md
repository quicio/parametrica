## Purpose

Run heavy fabrication preparation off the main thread with progress,
cancellation and deterministic results.

## ADDED Requirements

### Requirement: Worker execution

Heavy fabrication jobs SHALL run in a module Web Worker.

#### Scenario: Heavy job

- **WHEN** boolean, repair or self-intersection resolution is enabled
- **THEN** the report is computed in the worker
- **AND** the main thread stays responsive

#### Scenario: Light job

- **WHEN** no heavy option is enabled
- **THEN** the report may run synchronously
- **AND** behavior is unchanged

### Requirement: Progress

The worker SHALL report phases.

#### Scenario: Phases

- **WHEN** a job runs
- **THEN** engine, preparing, boolean/SDF and validation phases are reported
- **AND** the UI shows the current phase

### Requirement: Cancellation

The user SHALL be able to cancel a running job.

#### Scenario: Cancel

- **WHEN** the user cancels
- **THEN** the worker is terminated
- **AND** no partial result is used
- **AND** export stays disabled

#### Scenario: New run

- **WHEN** a new job starts
- **THEN** any previous job is cancelled first

### Requirement: Result cache

The last completed heavy report SHALL be cached.

#### Scenario: Export

- **WHEN** export is requested after a completed job
- **THEN** it uses the cached report
- **AND** does not recompute on the main thread

#### Scenario: Invalidation

- **WHEN** the document or preparation changes
- **THEN** the cached report is invalidated

### Requirement: Fallback

The system SHALL fall back to synchronous execution when Workers are absent.

#### Scenario: No Worker

- **WHEN** `Worker` is unavailable
- **THEN** the report runs synchronously
- **AND** the result is used normally
