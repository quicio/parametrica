# image-multicontour Specification

## Purpose
Trace multiple independent silhouettes from a reference image into separate
editable Fourier layers while preserving the existing largest-contour flow.
## Requirements
### Requirement: Multi-component tracing

The image pipeline SHALL trace each sufficiently large 4-connected foreground
component when all-contours mode is selected.

#### Scenario: Two separate silhouettes

- **WHEN** an image contains two disconnected dark circles
- **THEN** all-contours tracing returns two contours
- **AND** each contour has Fourier X/Y harmonics

#### Scenario: Bounded selection

- **WHEN** an image contains many components
- **THEN** components are sorted by area and capped at 12
- **AND** components below the area threshold are ignored

### Requirement: Multi-layer apply

Applying a multi-contour trace SHALL create one editable Fourier layer per
contour.

#### Scenario: Apply two contours

- **WHEN** the user applies a two-contour trace
- **THEN** the document has two `fourier` layers
- **AND** the document evaluates without errors
- **AND** no image data is serialized

### Requirement: Default behavior

The existing largest-contour path SHALL remain the default.

#### Scenario: Toggle off

- **WHEN** All contours is off
- **THEN** tracing uses the largest connected component only
- **AND** the existing single-document behavior is unchanged

### Requirement: Explicit limitation

Hole-aware/nested contour semantics SHALL remain outside this capability.

#### Scenario: Holes

- **WHEN** a silhouette contains an internal hole
- **THEN** the hole is not represented as a filled even-odd region
- **AND** the limitation is documented

