# helix-variations Specification

## Purpose
A named family of six helix presets that explores the parameter space of
the `helix` generator — the "VARIACIONES" row of the reference design. Each
preset is a valid, deterministic document that a user can load, mutate, and
export.
## Requirements
### Requirement: Six named variations

The preset library SHALL include exactly these six helix presets:

1. `Básica` — classic circular helix: `a=0, b=0, theta=0, r=120, p=30,
   turns=6`
2. `Radio Variable` — radial modulation: `a>0, k=3, phi=0`, classic pitch
3. `Paso Variable` — pitch ripple: `b>0, m=2, psi=0`, classic radius
4. `Ondulada` — wavy radius + pitch ripple combined: `a>0, k=4` and
   `b>0, m=3`
5. `Doble Hélice` — two interleaved helices: two curves with opposite
   `phi`/`theta` phase
6. `Cónica` — pointed cone: `a = r`, `k = 1/(2·turns)`, `phi = 0`
   makes the radius taper from `2r` at the start to `0` at the tip,
   using the existing radial modulation. No optional `exprR` is needed.

#### Scenario: Each variation loads

- **WHEN** the user selects a helix variation from the preset library
- **THEN** a valid document loads with `generator.id = 'helix'` and zero
  evaluation errors

#### Scenario: Variations are distinct

- **WHEN** any two variations are evaluated
- **THEN** their point sets differ (each explores a different region of
  parameter space)

### Requirement: Variations are deterministic

Each variation SHALL be fully specified by its parameters — no randomness,
no time dependence.

#### Scenario: Same document, same geometry

- **WHEN** a variation document is evaluated twice with the same seed
- **THEN** both evaluations produce identical point sets

### Requirement: Variations export cleanly

Each variation SHALL serialize to the standard document JSON and SVG.

#### Scenario: Export round-trip

- **WHEN** a variation document is exported to JSON and re-imported
- **THEN** the re-imported document evaluates to the same geometry
