/**
 * e2e/helpers.js — user-level helpers for Parametrica QA.
 *
 * These simulate a REAL user interacting with the lil-gui panel:
 * dragging sliders with the mouse (pointerdown → mousedown → mousemove
 * → mouseup → pointerup), typing into fields, clicking checkboxes.
 * The goal is to catch exactly the class of bug the screenshot
 * revealed: the panel shows a value but the document didn't change.
 */

/** Grab the app handle exposed on window (set by main.js). */
export function getApp(page) {
  return page.evaluate(() => window.__parametrica);
}

/** Read the current document params of the active generator. */
export function docParams(page) {
  return page.evaluate(() => ({ ...window.__parametrica.document.generator.params }));
}

/** Read what the evaluation currently produced (first point, count). */
export function evalState(page) {
  return page.evaluate(() => {
    const e = window.__parametrica.evaluation;
    return {
      first: e.curves[0]?.points[0] ?? null,
      pts: e.stats.pointCount,
      errors: e.errors.length,
    };
  });
}

/**
 * Find a lil-gui controller by its visible label. Returns the .controller element.
 * Prefers the one WITH a slider (the actual parameter), not the
 * "Modulate (time)" text field that shares the same label.
 */
export async function controller(page, label) {
  const names = page.locator(`.controller .name:has-text("${label}")`);
  const count = await names.count();
  if (count === 1) return names.locator('..');
  // Multiple matches: prefer the one whose widget contains a .slider.
  for (let i = 0; i < count; i++) {
    const ctrl = names.nth(i).locator('..');
    if ((await ctrl.locator('.slider').count()) > 0) return ctrl;
  }
  return names.first().locator('..');
}

/**
 * Drag a lil-gui slider to a specific fraction of its track (0..1).
 * Simulates the exact event sequence a physical mouse produces.
 */
export async function dragSlider(page, label, fraction) {
  const ctrl = await controller(page, label);
  const slider = ctrl.locator('.slider');
  const box = await slider.boundingBox();
  if (!box) throw new Error(`slider "${label}" has no box`);
  const cx = box.x + box.width * fraction;
  const cy = box.y + box.height / 2;

  // Physical mouse sequence: pointerdown+mousedown, move, mouseup+pointerup
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 1, cy, { steps: 2 });
  await page.mouse.up();
}

/**
 * Type a value directly into a controller's text input (the way a
 * user does when they click the number and type).
 */
export async function typeInto(page, label, value) {
  const ctrl = await controller(page, label);
  const input = ctrl.locator('input');
  await input.click();
  await input.fill(String(value));
  await input.press('Enter');
  // Wait for the debounce + rebuild to settle
  await page.waitForTimeout(300);
}

/** Read what a controller's input currently shows. */
export async function inputValue(page, label) {
  const ctrl = await controller(page, label);
  return ctrl.locator('input').inputValue();
}

/**
 * Assert that dragging a slider to `fraction` actually changed the
 * document param `key` to a value within a tolerance band of what
 * that fraction maps to. This is THE regression test for the bug
 * where the panel moved but the document didn't.
 */
export async function expectSliderChangesDoc(page, label, key, min, max, fraction, tolerance = 1) {
  const before = await docParams(page);
  const beforeVal = before[key];
  await dragSlider(page, label, fraction);
  await page.waitForTimeout(250);
  const after = await docParams(page);
  const expected = min + (max - min) * fraction;
  const ok = Math.abs(after[key] - expected) <= tolerance;
  return {
    ok,
    key,
    label,
    expected,
    actual: after[key],
    docChanged: after[key] !== beforeVal,
    message: `"${label}" → expected≈${expected.toFixed(2)}, doc=${after[key].toFixed(2)}`,
  };
}

/** Toggle a checkbox controller and report whether the doc followed. */
export async function toggleCheckbox(page, label) {
  const ctrl = await controller(page, label);
  const cb = ctrl.locator('input[type="checkbox"]');
  await cb.click();
  await page.waitForTimeout(200);
  return cb.isChecked();
}
