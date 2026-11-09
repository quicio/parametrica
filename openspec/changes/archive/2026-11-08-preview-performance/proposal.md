## Why

The PBR preview works, but its evidence is split between a software-WebGL
benchmark and a visual pixel test. There is no hardware benchmark, no explicit
frame budget and no stable CI screenshot policy.

## What Changes

- Define software and hardware benchmark runs.
- Define preview quality budgets and degradation.
- Keep the lazy-chunk guard in `check`.
- Define visual evidence policy (pixel variance now, hardware/CI screenshots later).
- Record SSAO cost and memory.
- Make preview failure/fallback observable.

## Out of Scope

- New renderer or PBR backend.
- Product render export (already archived).
- Geometry or fabrication changes.
