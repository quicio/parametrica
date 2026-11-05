/**
 * appearance.test.mjs — user Looks and per-pass appearance domain checks.
 */

import { LOOK_PRESETS } from '../../src/render/lookPresets.js';
import { LookPresetStore, LOOKS_STORAGE_KEY, applyUserLookToView, sanitizeUserLook } from '../../src/render/lookPresetStore.js';
import { resolvePassStyle, sanitizePassStyle } from '../../src/render/passStyle.js';

export function run(assert) {
  /* ——— 30i. user look presets ——— */
  console.log('30i. user look presets');
  {
    class MemoryStorage {
      constructor() { this.map = new Map(); }
      getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
      setItem(key, value) { this.map.set(key, String(value)); }
      removeItem(key) { this.map.delete(key); }
    }
    const storage = new MemoryStorage();
    const store = new LookPresetStore(storage, { reservedNames: LOOK_PRESETS.map((preset) => preset.name) });
    assert(store.list().length === 0, 'user look store starts empty');
    const view = {
      modes: ['stroke', 'points'],
      overlays: { inflections: true, bbox: true },
      colorMetric: 'height',
      guides: false,
      passOpacity: { stroke: 0.6 },
    };
    const saved = store.save('My Look', view);
    assert(saved.ok && saved.look.name === 'My Look', 'user look saves');
    assert(saved.look.modes.includes('points') && saved.look.overlays.bbox === true, 'user look stores view fields');
    assert(saved.look.geometry === undefined && saved.look.generator === undefined, 'user look does not store geometry');
    assert(store.findByName('My Look')?.id === saved.look.id, 'user look lookup by name');
    assert(store.save('Line', view).ok === false, 'built-in look names are reserved');
    const overwritten = store.save('My Look', { ...view, colorMetric: 'curvature' });
    assert(overwritten.ok && store.list().length === 1 && store.list()[0].colorMetric === 'curvature', 'user look overwrites by name');
    const applied = {
      modes: ['stroke'], overlays: {}, colorMetric: 'auto', guides: true, passOpacity: {},
      camera: { yaw: 1 }, artboard: { width: 900 },
    };
    assert(applyUserLookToView(applied, store.list()[0]) === true, 'user look applies');
    assert(applied.modes.includes('points') && applied.camera.yaw === 1, 'applying a look preserves non-look view fields');
    assert(store.remove(saved.look.id) === true && store.list().length === 0, 'user look deletes');
    storage.setItem(LOOKS_STORAGE_KEY, '{broken');
    assert(new LookPresetStore(storage, { reservedNames: [] }).list().length === 0, 'corrupt look storage is ignored');
    const sanitized = sanitizeUserLook({ name: 'X', modes: ['stroke'], overlays: {}, passOpacity: { a: 2 } });
    assert(sanitized.passOpacity.a === 1 && sanitized.guides === true, 'user look sanitizes opacity and defaults');
  }

  /* ——— 30j. pass appearance ——— */
  console.log('30j. pass appearance');
  {
    const sanitized = sanitizePassStyle({
      stroke: { color: '#ff0000', width: 3 },
      'surface-fill': { color: '#00ff00', width: 99 },
      bogus: { color: '#0000ff', width: 2 },
      points: { color: 'not-a-color', width: 2 },
    });
    assert(sanitized.stroke.color === '#ff0000' && sanitized.stroke.width === 3, 'pass appearance sanitizes color/width');
    assert(sanitized['surface-fill'].color === '#00ff00' && sanitized['surface-fill'].width === undefined, 'unsupported width is omitted');
    assert(sanitized.bogus === undefined, 'unknown passes are omitted');
    assert(sanitized.points === undefined, 'invalid color is omitted');

    const base = { stroke: { color: '#ffffff', width: 1 }, fill: { enabled: false }, blend: 'normal' };
    const resolved = resolvePassStyle('stroke', {
      style: base,
      passStyle: { stroke: { color: '#ff0000', width: 2.5 } },
    }, base);
    assert(resolved.stroke.color === '#ff0000' && resolved.stroke.width === 2.5, 'resolved pass style applies overrides');
    assert(resolved.fill === base.fill, 'resolved pass style preserves non-stroke fields');
    const inherited = resolvePassStyle('wireframe', { style: base, passStyle: {} }, base);
    assert(inherited === base, 'missing override inherits the base style');
  }
}
