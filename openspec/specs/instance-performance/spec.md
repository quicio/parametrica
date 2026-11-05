# instance-performance Specification

## Purpose
Provide evidence about the current 24-instance limit before changing the renderer.
## Requirements
### Requirement: Repeatable instance benchmark

The project SHALL provide a repeatable benchmark for 24 instance layers.

#### Scenario: Benchmark run

- **WHEN** the benchmark runs
- **THEN** it builds one 64×32 surface source and 24 instances
- **AND** it reports cold evaluation, cached evaluation, curve and point counts
- **AND** it renders without evaluation errors

### Requirement: Budgets

Benchmark results SHALL be compared with documented budgets.

#### Scenario: Budget check

- **WHEN** cold evaluation exceeds 500 ms or cached evaluation exceeds 50 ms
- **THEN** the result is recorded as a regression
- **AND** instanced rendering is evaluated as a separate change

### Requirement: Limit smoke

The 24-instance limit SHALL be smoke-tested in the browser.

#### Scenario: Limit render

- **WHEN** 24 instances are active
- **THEN** the canvas renders
- **AND** there are no evaluation or budget errors

