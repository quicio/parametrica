## Purpose

Define an optional WebGL/PBR product-preview backend that consumes the existing
RenderScene and the exact prepared fabrication mesh, adding material, lighting,
shadows and optional ambient occlusion without changing geometry, technical
rendering or export.

## ADDED Requirements

### Requirement: Optional PBR backend

The application SHALL provide an optional product-preview layer behind the
existing render-scene contract.

#### Scenario: Default

- **WHEN** a document opens
- **THEN** the p5 technical renderer remains the default
- **AND** the product backend is not loaded until requested

#### Scenario: Selection

- **WHEN** the user selects Product preview
- **THEN** the WebGL preview layer mounts over the same canvas
- **AND** it consumes `RenderScene.spatial`
- **AND** the prepared fabrication mesh is the same object used by Fabricate

#### Scenario: Return

- **WHEN** the user returns to Technical preview
- **THEN** p5 restores the technical scene
- **AND** the prepared mesh and fabrication report are unchanged

### Requirement: Spatial scene sidecar

`RenderScene` SHALL expose an optional spatial sidecar for 3D backends.

#### Scenario: Contents

- **WHEN** a scene is built
- **THEN** the sidecar carries world meshes, camera, projection, units, frame and
  layer identity
- **AND** the sidecar does not replace the existing artboard layers

#### Scenario: Shared mesh

- **WHEN** the sidecar is consumed
- **THEN** it references the prepared mesh rather than rebuilding the lattice
- **AND** code that only needs p5 continues to work without the sidecar

### Requirement: Preview material and lighting

Product preview SHALL provide a view-level material and lighting contract.

#### Scenario: Materials

- **WHEN** the user selects clay, ceramic, matte or custom
- **THEN** base color, roughness, metalness, clearcoat and sheen are applied
- **AND** the settings are sanitized and optional

#### Scenario: Separation

- **WHEN** the material changes
- **THEN** geometry resolution, fabrication validity and export bytes do not
  change
- **AND** `previewQuality` remains separate from `finishQuality`

#### Scenario: Lighting

- **WHEN** Product preview is active
- **THEN** a key light, fill and rim light produce readable form
- **AND** a directional shadow map and contact shadow are available
- **AND** ambient occlusion is optional and budgeted

### Requirement: Fallback and lifecycle

The product backend SHALL fail visibly and recoverably.

#### Scenario: Unsupported

- **WHEN** WebGL2 is unavailable or initialization fails
- **THEN** the app falls back to p5
- **AND** it shows a notice with the reason
- **AND** the canvas is not left empty

#### Scenario: Context loss

- **WHEN** the WebGL context is lost
- **THEN** the app attempts recovery or falls back to p5
- **AND** the fabrication report and export state are unchanged

### Requirement: Scope boundaries

Product preview SHALL NOT become a second geometry or fabrication pipeline.

#### Scenario: Technical overlay

- **WHEN** the user needs guides, coordinates, seams, inspection or picking
- **THEN** those remain on the p5 technical path
- **AND** Product preview does not claim overlay parity

#### Scenario: Export

- **WHEN** the user exports SVG, PNG, STL or 3MF
- **THEN** the existing technical/export path is used
- **AND** the chosen material does not alter the exported geometry or units

#### Scenario: Printability

- **WHEN** a material or shadow is displayed
- **THEN** it is presented as presentation, not as a printability guarantee
- **AND** manufacturing checks remain authoritative

### Requirement: Lazy loading and budget

The WebGL backend and its dependency SHALL be lazy-loaded and measured.

#### Scenario: Initial bundle

- **WHEN** the app starts in Technical mode
- **THEN** the WebGL dependency is not part of the initial bundle

#### Scenario: Degradation

- **WHEN** the preview exceeds its frame or memory budget
- **THEN** it reduces preview quality or falls back to p5
- **AND** the fallback is reported

#### Scenario: Evidence

- **WHEN** the slice is accepted
- **THEN** FPS, triangles, shadow-map size, memory and bundle impact are
  recorded as measurements
- **AND** provisional thresholds are marked as such
