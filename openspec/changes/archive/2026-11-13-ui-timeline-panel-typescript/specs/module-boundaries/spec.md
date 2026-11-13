## ADDED Requirements

### Requirement: Typed timeline panel

The timeline panel SHALL be strict TypeScript.

#### Scenario: Animate

- **WHEN** tracks and keyframes are edited, recorded or exported
- **THEN** timelines, tracks, keyframes and ports are typed
- **AND** editing, recording and export output are unchanged

### Requirement: Timeline compatibility

The old `ui/widgets/TimelinePanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** timeline-port checks read the typed module
