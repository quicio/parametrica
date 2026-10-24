# image-input-panel Specification

## Purpose
Bring external silhouettes into the mathematical space safely: reference
underlay first, then an editable Fourier approximation of one strong contour.
## Requirements
### Requirement: Image underlay

The user SHALL upload a local image and adjust opacity, scale, position and
rotation as a reference.

#### Scenario: Underlay

- **WHEN** an image is uploaded
- **THEN** it appears behind the canvas and the document is unchanged

### Requirement: Contour extraction

The trace action SHALL extract the largest closed high-contrast contour.

#### Scenario: Silhouette

- **WHEN** the user traces a black circle on white
- **THEN** one closed contour is found

#### Scenario: No contour

- **WHEN** no contour passes the threshold
- **THEN** an error is shown and no document is created

### Requirement: Fourier conversion

The contour SHALL become an editable `fourier` document with harmonics.

#### Scenario: Editable result

- **WHEN** tracing succeeds
- **THEN** the generator id is `fourier`
- **AND** harmonics can be edited after applying

### Requirement: Reconstruction preview

The UI SHALL show the extracted contour and reconstruction error before
applying.

#### Scenario: Preview

- **WHEN** a contour is extracted
- **THEN** the user sees the contour and can cancel without changing the document

### Requirement: Privacy

The image SHALL not leave the browser and SHALL not be embedded in the
document.

#### Scenario: Apply

- **WHEN** the traced document is saved
- **THEN** it contains harmonics only, not image data
