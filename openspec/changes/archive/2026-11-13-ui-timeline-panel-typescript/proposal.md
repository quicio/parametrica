## Why

The timeline panel edits keyframes and drives PNG/ZIP, SVG and GIF sequence
export through the renderer and exporter ports.

## What Changes

- Convert `ui/widgets/TimelinePanel.js` to `.ts`.
- Type timelines, tracks, keyframes, app/render/exporter ports and exports.
- Point the timeline-port architecture check at the typed module.
- Keep the JS compatibility re-export.

## Out of Scope

- Sections and Controls.
