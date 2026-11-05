# composition-preview Specification

## Purpose
Make dense composition previews legible in Start With without changing the
preset browser or document evaluation contract.
## Requirements
### Requirement: Larger Start With preview

The Start With overlay SHALL render composition previews at a larger size.

#### Scenario: Composition card

- **WHEN** the Start With overlay opens
- **THEN** the Composition preview is rendered at 224 px
- **AND** it uses the existing evaluated wireframe representation
- **AND** the card keeps the same dimensions as the other cards

#### Scenario: Preset browser

- **WHEN** the preset browser requests a preview
- **THEN** it continues to use the 96 px preset preview
- **AND** Start With does not overwrite that cache entry

### Requirement: Preview fallback

A failed larger preview SHALL degrade to the placeholder.

#### Scenario: Render failure

- **WHEN** the larger preview cannot be generated
- **THEN** a stable placeholder is shown
- **AND** the card remains selectable

### Requirement: Isolation

Preview generation SHALL NOT mutate the document.

#### Scenario: Open Start With

- **WHEN** previews are generated
- **THEN** the active document, history and session are unchanged

