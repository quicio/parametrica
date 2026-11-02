# svg-frame-export Specification

## Purpose
Export a deterministic sequence of SVG frames from the Perform timeline,
packaged with a manifest for downstream use.

## Requirements
### Requirement: SVG frame sequence

Timeline SHALL export a ZIP of standalone SVG frames using the same
duration/FPS sampling as the PNG sequence.

#### Scenario: Deterministic frames

- **WHEN** the timeline duration is 6 s at 24 FPS
- **THEN** the archive contains 144 `frame-NNN.svg` files
- **AND** their timestamps match the frame contract

#### Scenario: Frame fidelity

- **WHEN** a frame is generated
- **THEN** it contains the active vector passes, overlays, blend and fill
  gradients
- **AND** it embeds the Parametrica document comment
- **AND** the artboard dimensions/background match the document

### Requirement: Manifest

The SVG frame archive SHALL include a manifest with duration, FPS, frame count
and file/time mappings.

#### Scenario: Manifest format

- **WHEN** the archive is inspected
- **THEN** `manifest.json` has `format: "svg"` and one entry per frame
- **AND** raster-only omissions are listed per frame

### Requirement: State restoration

The export SHALL restore the playhead and playback state.

#### Scenario: Export from a paused document

- **WHEN** the user exports SVG frames
- **THEN** playback is paused during sampling
- **AND** the original time and playing state return afterwards

### Requirement: Perform ownership

SVG frame export SHALL live with Timeline in Perform.

#### Scenario: Keep boundary

- **WHEN** the user opens Keep
- **THEN** the temporal SVG frame action is not duplicated there
- **AND** single-file SVG/PNG/JSON export remains available

### Requirement: Frame count and status

The SVG frame export SHALL use the same frame count as the timeline FPS plan
and report the number of produced frames.

#### Scenario: Status

- **WHEN** the export completes
- **THEN** the timeline status reports the produced frame count
