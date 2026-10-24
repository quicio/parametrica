# Contributing to Parametrica

This document explains how to extend Parametrica. The codebase is
designed so that **adding a new generator, operator, render pass or
preset requires dropping one file into the right directory** and
nothing else.

For the architectural rationale, see [SPEC.md](./SPEC.md). For usage,
see [README.md](./README.md).

---

## Ground rules

1. **The core stays DOM-free.** Anything under `src/core/`, `src/math/`,
   `src/sampling/`, `src/analysis/`, `src/generators/`, `src/operators/`,
   `src/animation/`, `src/mutation/`, and the v1-compatible geometry
   helpers under `src/geometry/` must run in pure Node. No `window`,
   `document`, `p5`, or DOM-touching imports. The test suite
   (`test/lab.smoke.mjs`) verifies this by importing your module directly.

2. **All math is pure.** A generator's `sample` function and an operator's
   `apply` function must be referentially transparent: same params + same
   `ctx` (time, seed, scope) ⇒ same output. No hidden state.

3. **Stages are replaceable, not editable.** Don't add cases or flags to
   the engine. Add a new module that registers itself.

4. **Tests are not optional.** Every new generator or operator ships with
   at least one test in `test/lab.smoke.mjs`. Use `evalOK(doc, label)`
   for evaluation smoke tests.

---

## Adding a generator

Generators produce the **initial** curve family from a set of parameters.
They live in `src/generators/` and self-register on import.

### Skeleton

```js
// src/generators/mything.js
import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { compileOrThrow, makeScope, sampleParametric, postProcess } from './helpers.js';

Generators.register({
  id: 'mything',                                    // unique id
  name: 'My Thing',                                  // human-readable
  params: {
    expr: {
      label: 'r(θ)', type: TYPE.EXPRESSION,
      default: 'sin(3*theta) * 100',
      doc: 'Optional help text shown in the panel.',
    },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 32, max: 8000, default: 500 },
    closed:  { label: 'Closed', type: TYPE.BOOLEAN, default: true },
  },

  domain: (p) => ({ t0: 0, t1: Math.PI * 2, closed: p.closed }),

  sample(params, ctx) {
    const fn = compileOrThrow(params.expr, 'r(θ)');
    const scope = makeScope(ctx);
    const points = [];
    for (let i = 0; i < params.samples; i++) {
      const theta = (Math.PI * 2 * i) / params.samples;
      scope.theta = theta;
      const r = fn(scope);
      points.push({ x: Math.cos(theta) * r, y: Math.sin(theta) * r });
    }
    const curve = { id: `mything-${Date.now()}`, points, closed: params.closed, meta: { source: 'mything' } };
    return postProcess([curve], params);
  },
});
```

### Register the module

Add the import to `src/generators/index.js`:

```js
import './mything.js';
```

That's the only edit outside the new file.

### Test it

Add to `test/lab.smoke.mjs` group 4 (generators):

```js
const doc = createDocument('mything');
evalOK(doc, 'mything default');
```

---

## Adding an operator

Operators transform `Curve[]` into `Curve[]`. Two flavors:

- **geometry/**: visual transformations (no topology change)
- **topology/**: structural transformations (may change curve count, openness)

### Skeleton (geometry)

```js
// src/operators/geometry/mydeform.js
import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';

Operators.register({
  id: 'mydeform',
  name: 'My Deform',
  params: {
    dx: { label: 'dx(x,y)', type: TYPE.EXPRESSION, default: '0' },
    dy: { label: 'dy(x,y)', type: TYPE.EXPRESSION, default: '0' },
  },

  apply(curves, params, ctx) {
    const dxf = compileOrThrow(params.dx, 'dx');
    const dyf = compileOrThrow(params.dy, 'dy');
    const scope = Object.assign(Object.create(null), ctx.scope, { time: ctx.time });

    return curves.map((c) => ({
      ...c,
      points: c.points.map((p) => {
        scope.x = p.x; scope.y = p.y;
        return { x: p.x + (dxf(scope) || 0), y: p.y + (dyf(scope) || 0) };
      }),
    }));
  },
});
```

### Skeleton (topology)

```js
Operators.register({
  id: 'mytopo',
  apply(curves, params, ctx) {
    // can return MORE curves than input
    const out = [];
    for (const c of curves) out.push(c, mirrorCopy(c));
    return out;
  },
});
```

### Register + test

Same pattern: add to `src/operators/index.js` and add an evalOK check in
group 5 of the smoke suite.

---

## Adding a render pass

Render passes draw into the p5 canvas. They're composable: a document
can have multiple active passes via `view.modes`.

### Skeleton

```js
// src/render/passes/mypass.js
import { RenderPasses } from '../../core/registry.js';

RenderPasses.register({
  id: 'mypass',
  name: 'My Pass',
  draw(p, { curves, analysis, view, time }) {
    p.push();
    p.noFill();
    p.stroke(255, 80);
    p.strokeWeight(1);
    for (const c of curves) {
      p.beginShape();
      for (const q of c.points) p.vertex(q.x, q.y);
      p.endShape();
    }
    p.pop();
  },
});
```

`draw` receives the p5 instance and a `data` object with everything the
pass might need: `curves`, `analysis`, `bbox`, `view`, `document`, `time`.

### Register + test

Add to `src/render/passes/index.js`. No test required (passes are
visual), but verify manually with `npm run dev`.

---

## Adding a built-in preset

Edit `src/presets/builtins.js`. Each preset is a factory returning a
fresh `createDocument(...)`:

```js
import { createDocument } from '../core/document.js';

export const BUILT_IN_PRESETS = {
  // ...

  'My Preset': () =>
    createDocument('parametric', {
      name: 'My Preset',
      generator: {
        params: {
          exprX: 'sin(t) * cos(3*t)',
          exprY: 'cos(t) * sin(3*t)',
          fit: 280,
        },
      },
    }),
};
```

Add a `evalOK` check in group 7 of the smoke suite to ensure the preset
evaluates without errors.

---

## Expression engine

If your generator or operator takes a user-editable equation, use the
expression engine — never `eval` or `new Function`.

Available in scope (when the engine calls your function with `ctx`):

| Name | Source |
|---|---|
| `t`, `theta` | loop variable |
| `time` | animation time (driven by transport) |
| `pi`, `tau`, `e`, `phi` | constants |
| `sin cos tan asin acos atan atan2 sinh cosh tanh` | trig |
| `abs sign floor ceil round fract` | arithmetic |
| `sqrt cbrt exp log log2 log10 pow hypot` | power/log |
| `min max mod clamp lerp step smoothstep` | shaping |
| `saw tri square` | waveforms |
| `noise(x)` · `noise(x, y)` | seeded simplex |

To parse user source:

```js
import { compileOrThrow } from '../generators/helpers.js';
const fn = compileOrThrow(params.expr, 'x(t)');
const value = fn({ t, theta, time, ...stdlib });
```

For error reporting that survives evaluation failures, use
`compileExpression(...)` directly and route spans back to the UI.

---

## Mutation

If your new stage has interesting parameter spaces, you may want the
mutation engine to perturb it. Edit `src/mutation/MutationEngine.js`:

- Numeric params are perturbed with gaussian noise scaled by the
  schema range (`amount × range × 0.16`). Out of the box.
- String params are perturbed via `perturbLiterals(source, gaussian,
  strength)` from `src/math/expression.js`. Only numeric literals change;
  the surrounding syntax is preserved.

For tables (e.g. Fourier harmonics), see how `MutationEngine.#perturb`
handles `harmonicsX`/`harmonicsY` — it iterates rows, perturbs
`amp/phase/freq/rot`, and occasionally adds or removes a row.

---

## Release checklist

Before opening a PR (or merging to `main`):

- [ ] `npm run lint` passes
- [ ] `npm test` passes (all checks)
- [ ] `npm run test:e2e` passes
- [ ] `npm run build` produces a clean bundle
- [ ] New files are documented in [SPEC.md](./SPEC.md) if they change
      the public surface (new generator id, new operator id, new render
      pass id)
- [ ] User-facing strings are localizable-ready (single source of truth,
      ideally in the schema `label`/`doc` fields rather than hard-coded
      in components)

---

## Where things live

| Concern | Directory |
|---|---|
| New generator | `src/generators/<name>.js` + register in `src/generators/index.js` |
| New geometry operator | `src/operators/geometry/<name>.js` + `src/operators/index.js` |
| New topology operator | `src/operators/topology/<name>.js` + `src/operators/index.js` |
| New render pass | `src/render/passes/<name>.js` + `src/render/passes/index.js` |
| New built-in preset | `src/presets/builtins.js` |
| New UI section | `src/ui/Controls.js` (add a `buildXSection()` method) |
| New widget | `src/ui/widgets/<name>.js` |
| Schema/param types | `src/core/schema.js` (`TYPE` enum + `schemaDefaults`) |
| Tests | `test/lab.smoke.mjs` (one assertion per behaviour, grouped 1–26) |
| Architecture docs | [SPEC.md](./SPEC.md) |
