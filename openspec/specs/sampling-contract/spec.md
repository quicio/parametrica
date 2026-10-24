# sampling-contract Specification

## Purpose
Every generator must honor its Samples control with one unambiguous
contract: exact count in uniform mode, hard upper bound in adaptive
mode, and a sampler that always reaches the end of the parameter domain.
## Requirements
### Requirement: Uniform mode is exact

For every generator exposing `samples` and `adaptive`, setting
`adaptive = false` SHALL produce exactly `samples` points for a
single-curve generator.

Affected single-curve generators: `parametric`, `polar`, `custom`,
`lissajous`, `rose`, `superformula`, `hypotrochoid`, `epitrochoid`,
`spirograph`, `harmonic-oscillator`.

#### Scenario: Exact count

- **WHEN** `adaptive = false` and `samples = 321`
- **THEN** the emitted curve has exactly 321 points

### Requirement: Adaptive mode is a cap

With `adaptive = true`, output length SHALL satisfy
`2 <= points.length <= samples` for `samples >= 2`.

#### Scenario: Low cap respected

- **WHEN** `samples = 64` and adaptive sampling is enabled
- **THEN** no generator emits more than 64 points

#### Scenario: High cap is allowed but not required

- **WHEN** `samples = 2000` and the curve is smooth
- **THEN** output may contain fewer than 2000 points
- **AND** it never contains more

### Requirement: Sampler endpoint completeness

`sampleAdaptive(fn, t0, t1, { samples })` SHALL include `fn(t1)` as the
last point whenever `samples >= 2`, regardless of whether refinement
uses the full budget.

#### Scenario: Smooth curve reaches t1

- **WHEN** sampling a circle over `[0, tau]` with `samples = 200` and
  `minSteps = 8`
- **THEN** the final point equals `(1, 0)` within `1e-9`
- **AND** the output length is `< 200`

#### Scenario: Budget fills on high curvature

- **WHEN** sampling the reference Lissajous curve with `samples = 50`
  and `minSteps = 8`
- **THEN** the output length is exactly 50

### Requirement: Optional exact-count mode in the UI

Every adaptive generator SHALL expose an `Adaptive Sampling` boolean
with default `true`. Turning it off SHALL use `sampleUniform` with the
requested `samples` count.

#### Scenario: UI toggle changes mode

- **WHEN** the user disables Adaptive Sampling on the Lissajous
  generator and sets Samples to 500
- **THEN** telemetry reports 500 points

### Requirement: Closure follows actual endpoints

Curves without a user-facing `closed` parameter SHALL use the sampled
endpoint criterion from `document-integrity` when setting the closure
flag.

#### Scenario: Auto-closed generator

- **WHEN** a generator without a `closed` parameter emits a curve whose
  last point equals its first point within `1e-6`
- **THEN** `curve.closed` is `true`

#### Scenario: Open auto-closed generator

- **WHEN** the same generator emits a curve whose endpoints differ by
  more than `1e-6`
- **THEN** `curve.closed` is `false`
