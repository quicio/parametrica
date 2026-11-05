## Why

A Node benchmark of 24 instances of a 64×32 surface showed ~196 ms first
evaluation and ~3.9 ms cached, with 2400 curves and 102400 points. There is no
browser benchmark, and the interaction between evaluation, projection, p5 draw
and instance limits is unmeasured.

## What Changes

- Add a browser benchmark for 24 instances.
- Record first evaluation, cached evaluation, projection/frame cost and point
  count.
- Add a smoke e2e that renders the limit without errors.
- Define a threshold for proposing instanced rendering later.
- Keep the current 24-instance limit.

## Capabilities

### New Capabilities

- `instance-performance`: measurable 24-instance behavior.

### Modified Capabilities

- `bundle-performance`: instance benchmark gate.

## Impact

- New benchmark script/page or Playwright benchmark helper
- Possibly expose evaluation timing via existing `stats`
- Documentation of measured results
- No renderer or geometry change.

## Non-goals

- No instanced rendering in this slice.
- No higher instance limit.
- No WebGL rewrite.
- No new dependency.
