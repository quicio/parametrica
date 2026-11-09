# GitHub Pages deployment

**Live URL:** https://quicio.github.io/parametrica/
**Workflow:** `.github/workflows/pages.yml`
**Source:** `main`
**Hosting:** GitHub Pages, static build in `dist/`

Parametrica is a fully static Vite app: no backend, accounts, secrets or
runtime environment variables. GitHub Pages serves the production bundle
directly.

---

## How it works

```
push to main
   │
   ▼
Deploy GitHub Pages (pages.yml)
   ├── npm ci
   ├── npm run build        → dist/
   ├── actions/configure-pages
   ├── actions/upload-pages-artifact (dist/)
   └── actions/deploy-pages → https://quicio.github.io/parametrica/
```

The workflow has two jobs:

| Job | Purpose |
|---|---|
| `build` | Installs dependencies, builds Vite and uploads `dist/` as the Pages artifact. |
| `deploy` | Publishes the artifact to the `github-pages` environment. |

It also runs on `workflow_dispatch`, so a deployment can be started manually
without a new commit.

### Triggers

- Every push to `main`.
- Manual **Run workflow** from the Actions tab.
- Manual CLI:

```bash
gh workflow run pages.yml
```

### Permissions and concurrency

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true
```

`pages: write` and `id-token: write` are required by `deploy-pages`. The
concurrency group prevents two deployments from racing; a newer push cancels
an in-flight one.

---

## Build configuration for Pages

`vite.config.js` uses:

```js
base: './'
```

Relative asset URLs mean the same `dist/` works at:

- `https://quicio.github.io/parametrica/` (project page), and
- `https://example.com/` (custom domain or root hosting).

The production build emits:

- `dist/index.html`
- `dist/assets/*.js`, `*.css`
- lazy chunks for p5, ProductPreview, CodeMirror, geometry vendors
- `dist/assets/manifold-*.wasm`

`public/.nojekyll` is copied to `dist/.nojekyll`. It disables Jekyll
processing, which is important for static assets and files that begin with an
underscore.

### Workers and WASM

- The fabrication worker is emitted with
  `new Worker(new URL(..., import.meta.url), { type: 'module' })`; Vite rewrites
  it to an emitted asset with the correct relative URL.
- Manifold loads its WASM through `manifold-3d/manifold.wasm?url`; Vite emits
  the `.wasm` file into `dist/assets/`.
- If the WASM request fails, Fabricate still has the BSP/remesh fallback; the
  technical renderer is unaffected.

---

## One-time repository setup

GitHub Pages must use **GitHub Actions** as its source.

### UI

1. Repository **Settings**.
2. **Pages**.
3. **Build and deployment → Source: GitHub Actions**.

### CLI

```bash
gh api --method POST repos/OWNER/REPO/pages -f build_type=workflow
```

Verify:

```bash
gh api repos/OWNER/REPO/pages
# "build_type": "workflow"
# "html_url": "https://OWNER.github.io/REPO/"
```

The workflow can be pushed before or after this step, but the first
`deploy-pages` run needs Pages enabled.

---

## Verify a deployment

### Workflow status

```bash
gh run list --workflow=pages.yml --limit 3
gh run watch <run-id> --exit-status
```

### HTTP

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://quicio.github.io/parametrica/
# 200
```

### Browser smoke test

The live bundle was verified in headless Chromium:

- page title: `Parametrica — A parametric geometry workbench`
- renderer: p5 available
- evaluation: 1 curve, 513 points, 0 errors
- presets: 65
- no HTTP responses ≥ 400
- no page errors

A quick manual check:

1. Open https://quicio.github.io/parametrica/.
2. Dismiss the start overlay.
3. Change a generator parameter and confirm the canvas updates.
4. Open **Make/Fabricate**, wait for **READY**, choose **Product**.
5. Export STL or 3MF.

### Local subpath check

To reproduce the project-page path locally:

```bash
npm run build
rm -rf /tmp/pages
mkdir -p /tmp/pages/parametrica
cp -R dist/. /tmp/pages/parametrica/
(cd /tmp/pages && python3 -m http.server 8000)
# open http://127.0.0.1:8000/parametrica/
```

This catches absolute asset paths that would work at `/` but fail under
`/parametrica/`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `404` at the Pages URL | Pages not enabled, or no successful deployment | Check **Settings → Pages** and the `pages.yml` run. |
| HTML loads but JS/CSS 404 | Absolute asset paths | Keep `base: './'` in `vite.config.js`; rebuild and redeploy. |
| `deploy-pages` fails with permissions | Missing `pages: write` / `id-token: write` | Confirm the workflow permissions block. |
| Deployment is queued forever | Environment protection or concurrency | Check the `github-pages` environment and cancel older runs. |
| Manifold/WASM 404 | WASM not emitted or asset path broken | Inspect `dist/assets/manifold-*.wasm` and the browser network panel. Fabricate falls back, but booleans are slower. |
| Old version still visible | CDN/browser cache or deployment not finished | Check the latest successful run, hard-refresh, or verify the asset hash changed. |
| Node 20 deprecation warning in Actions | GitHub runner action deprecation notice | Harmless for this workflow; update action majors when available. |

---

## Custom domain

1. Add the domain in **Settings → Pages → Custom domain**.
2. Create the DNS records GitHub requests.
3. Keep `base: './'`; the relative bundle works at the domain root.
4. Do not add a `CNAME` file to `public/` unless the domain is permanent for
   the repository.

---

## Updating the page

Any push to `main` redeploys automatically. Only `dist/` is published; source
files, tests, `docs/` and `openspec/` are not served.

If a release should not deploy, push to a branch or add a temporary path filter
to `pages.yml` and restore it before the next release.

---

## Security and privacy

- The page is static and public.
- No secrets are used in the build.
- No analytics, accounts, backend or telemetry are added by the deployment.
- All computation runs in the browser.
- Local storage remains origin-scoped to `quicio.github.io` for the live page.

---

## Related files

- `.github/workflows/pages.yml` — build and deploy.
- `vite.config.js` — relative base and chunking.
- `public/.nojekyll` — Jekyll bypass.
- `README.md` — live demo link and fork instructions.
