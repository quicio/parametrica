## Purpose

Documents are the serializable form of a piece of work; one document
must never mutate another, and serialized presets must not silently
shadow each other. Closure flags must describe the actual sampled
geometry so exports do not invent segments.

## ADDED Requirements

### Requirement: No shared mutable view defaults

`createDocument` and `sanitizeDocument` SHALL return documents whose
`view.modes`, `view.overlays` and `view.camera` are distinct objects
from the module defaults and from every other document.

#### Scenario: Overlay toggle isolation

- **WHEN** document A enables `overlays.inflections`
- **THEN** a newly created document B has `overlays.inflections === false`
- **AND** A's and B's overlay objects are not the same reference

#### Scenario: Camera isolation

- **WHEN** document A's camera yaw is changed
- **THEN** a newly created document B keeps the default yaw
- **AND** the exported `DEFAULT_CAMERA` values are unchanged

#### Scenario: Modes array isolation

- **WHEN** document A pushes a mode into `view.modes`
- **THEN** document B's `view.modes` is unchanged

### Requirement: No shared schema defaults

`schemaDefaults` SHALL deep-clone object and array defaults so harmonic
tables and any future structured defaults are per-document.

#### Scenario: Fourier harmonics isolation

- **WHEN** one Fourier document mutates `harmonicsX[0].amp`
- **THEN** a new Fourier document keeps the schema default amplitude

### Requirement: Built-in preset names are reserved

`PresetManager.save` SHALL reject names that collide with a built-in
preset and SHALL leave the existing user store unchanged.

#### Scenario: Collision rejected

- **WHEN** the user saves a preset named `Lissajous 3:5`
- **THEN** the save throws an error surfaced in the notice area
- **AND** `PresetManager.get('Lissajous 3:5')` still returns the built-in

### Requirement: Closure reflects sampled endpoints

Generators without an explicit `closed` parameter SHALL set
`curve.closed` from the distance between the first and last sampled
points, using `hypot(dx, dy) <= 1e-6`.

Affected generators: `lissajous`, `superformula`, `fourier`, `rose`,
`hypotrochoid`, `epitrochoid`, `spirograph`.

#### Scenario: Rational Lissajous closes

- **WHEN** `a = 3`, `b = 5` and the domain is `[0, tau]`
- **THEN** `curves[0].closed === true`

#### Scenario: Fractional Lissajous stays open

- **WHEN** `a = 1.25`, `b = 5` and the domain is `[0, tau]`
- **THEN** `curves[0].closed === false`

#### Scenario: Fractional superformula stays open

- **WHEN** `m = 5`, `a = 1`, `b = 2` (endpoint radius differs over `[0, tau]`)
- **THEN** the emitted curve is not marked closed
