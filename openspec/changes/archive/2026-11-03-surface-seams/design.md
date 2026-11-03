## Context

SurfaceMapping preserves real domain endpoints, closed flags, seam/reverse
flags and per-corner UVs. Mesh welding means the original grid endpoints are not
retained well enough to prove geometric continuity. Visual semantics must stay
within what is declared.

## Decisions

### D1: Three distinct semantics

- Open axis edge = **border**.
- Closed axis logical end = **declared seam**.
- Closed + reverse = **twist seam**.

An open axis draws both borders; a closed axis draws one seam at u1/v1 and does
not duplicate u0/v0. Inverted domains keep logical ends.

### D2: Edge derivation

For each mapping face, classify each edge by its two UVs and the domain. Closed
seams use `seam-u/v`; reverse seams use `seam-u/v-twist`. Deduplicate by mesh
edge and kind. Missing/malformed mappings produce unavailable/partial status,
never invented seams.

### D3: Rigor

`declared` means metadata, not geometric continuity. Seam pairs and twist
orientation are not drawn because the current mapping does not expose them.

### D4: Rendering/UI

The overlay is drawn in single Canvas after geometry and before the pick
overlay, clipped to the artboard, cached per scene, skipped in captureMode. A
compact legend explains border/seam/twist and status. Quad hides it.

## Risks / Trade-offs

- Dense wireframes can obscure thin border lines.
- No continuity claim limits what users can conclude.
- Seam pairing/twist orientation need a future contract.
- Single Canvas only.
