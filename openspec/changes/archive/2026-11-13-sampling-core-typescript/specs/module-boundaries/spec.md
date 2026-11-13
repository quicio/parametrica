## ADDED Requirements

### Requirement: Typed curve sampling

Uniform/adaptive sampling and discontinuity splitting SHALL be strict
TypeScript.

#### Scenario: Sample

- **WHEN** a generator samples its parameter domain
- **THEN** intervals, heaps, runs and split results are typed
- **AND** sample counts and split thresholds are unchanged

### Requirement: Typed sampling helpers

Arc length, resampling, bboxes, fitting and centering SHALL be strict
TypeScript.

#### Scenario: Normalize

- **WHEN** curves are resampled, fitted or centered
- **THEN** tables, counts, bboxes and point types are typed
- **AND** normalized geometry is unchanged

### Requirement: Sampling compatibility

The old `sampling/sampling.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
