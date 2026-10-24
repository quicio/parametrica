## Decisions

### D1: Quality gate without a formatting rewrite

ESLint uses a flat config with `eslint:recommended` plus explicit globals for
browser, Node and Playwright files. Formatting is out of scope: a full Prettier
pass would obscure the functional diff. `npm run lint` is the gate and CI runs
it before the unit suite.

### D2: CodeMirror 6 with the existing grammar

`ExpressionField` keeps its public API (`get`, `set`, `refresh`, `setError`,
`destroy`). A small `StreamLanguage` tokenizer mirrors the expression engine's
categories: numbers, identifiers/functions, operators and punctuation.
CodeMirror 6 is used directly (state/view/language/commands/lezer) instead of
the meta `codemirror` package so the extension surface stays explicit.

Single-line fields reject multi-line changes and bind Enter to commit + blur.
Multiline source fields keep native newlines and bind Mod-Enter to commit.
External document refreshes dispatch without triggering the debounce.

### D3: p5 is a lazy renderer chunk

`P5Renderer` no longer statically imports p5. `load()` dynamically imports it
and assigns `readyPromise`; the app exposes `window.__parametricaReady`.
Methods that require the sketch guard on `this.p`. Vite splits p5, CodeMirror,
lil-gui and geometry vendors into explicit chunks. The eager app shell remains
below the 500 kB warning threshold; the lazy p5 chunk is documented.

### D4: Recovery is explicit, snapshots are automatic

`SessionStore` writes a versioned document snapshot to localStorage after an
800 ms debounce. Playback is forced off in the snapshot. On startup the app
does not replace the document: it shows a fixed Restore / Dismiss banner.
Autosave is paused while recovery is pending, so edits cannot overwrite the
snapshot before the user decides. Corrupt snapshots and quota failures never
throw into the app.

### D5: Documentation is part of the gate

README, SPEC and architecture counts are updated with the generator, preset,
render-pass and test inventories. The deferred list keeps only genuinely
unfinished items.
