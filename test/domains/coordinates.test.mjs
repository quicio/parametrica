/**
 * coordinates.test.mjs — viewport coordinates domain checks.
 */

import '../../src/generators/index.ts';
import {
  DEFAULT_COORDINATES,
  PROJECTION_AXES,
  buildCoordinateTicks,
  buildViewportDescriptor,
  coordinateUnitInfo,
  createCoordinates,
  formatCoordinate,
  formatCoordinateReadout,
  isOrthographicProjection,
  localPointInPanel,
  niceStep,
  panelAtPoint,
  quadPanelLayout,
  sanitizeCoordinates,
  worldFromArtboardPoint,
} from '../../src/view/viewportCoordinates.ts';
import { createDefaultUnits } from '../../src/core/units.ts';
import { createDocument, sanitizeDocument } from '../../src/core/document.ts';
import { createViewTransform } from '../../src/view/transform.ts';
import { evaluateDocument } from '../../src/core/engine.ts';

export function run(assert) {
  /* ——— 30f. viewport coordinates ——— */
  console.log('30f. viewport coordinates');
  {
    assert(DEFAULT_COORDINATES.enabled === false && DEFAULT_COORDINATES.grid === true, 'coordinates default off with grid ready');
    assert(DEFAULT_COORDINATES.cursor === false && DEFAULT_COORDINATES.step === null, 'cursor and manual step default off');
    const sanitized = sanitizeCoordinates({ enabled: 1, grid: false, cursor: 1, step: -3, unitDisplay: 'furlong' });
    assert(sanitized.enabled === true && sanitized.grid === false && sanitized.cursor === true, 'coordinate booleans sanitize');
    assert(sanitized.step === null && sanitized.unitDisplay === 'auto', 'invalid step/unit display fall back safely');
    assert(sanitizeCoordinates({}).grid === true, 'missing grid defaults on');

    assert(PROJECTION_AXES.xy.horizontal.id === 'x' && PROJECTION_AXES.xy.vertical.id === 'y' && PROJECTION_AXES.xy.depth.id === 'z', 'XY axes map x/y/z');
    assert(PROJECTION_AXES.xz.horizontal.id === 'x' && PROJECTION_AXES.xz.vertical.id === 'z' && PROJECTION_AXES.xz.depth.id === 'y', 'XZ axes map x/z/y');
    assert(PROJECTION_AXES.yz.horizontal.id === 'y' && PROJECTION_AXES.yz.vertical.id === 'z' && PROJECTION_AXES.yz.depth.id === 'x', 'YZ axes map y/z/x');
    assert(PROJECTION_AXES.yz.horizontal.sign === -1 && PROJECTION_AXES.yz.vertical.sign === -1, 'YZ records negative screen signs');
    assert(isOrthographicProjection('xz') && !isOrthographicProjection('3d'), '3D is not an orthographic coordinate plane');

    const worldScale = { world: 'mm', mmPerWorldUnit: 2.5, artboard: 'unitless', mmPerArtboardUnit: null };
    const physicalInfo = coordinateUnitInfo(worldScale, 'auto');
    assert(physicalInfo.factor === 2.5 && physicalInfo.suffix === 'mm', 'auto display uses millimetres when scaled');
    assert(coordinateUnitInfo(worldScale, 'world').factor === 1, 'world display keeps canonical values');
    assert(coordinateUnitInfo(createDefaultUnits(), 'physical').suffix === '', 'unitless display never claims millimetres');
    assert(formatCoordinate(4, physicalInfo) === '10.0', 'coordinate formatting applies the display factor');
    assert(formatCoordinateReadout({ x: 1, y: null, z: -2 }, { factor: 1, suffix: '' }) === 'x 1.00 · y — · z -2.00', 'cursor readout marks the dropped axis as unknown');

    const transform = createViewTransform({
      projection: 'xz',
      frame: { mode: 'world', anchor: 'world-origin', scale: 2 },
    });
    const descriptor = buildViewportDescriptor({
      projection: 'xz',
      transform,
      units: createDefaultUnits(),
      panelSize: { w: 900, h: 900 },
    });
    assert(descriptor.orthographic === true && descriptor.scale === 2, 'descriptor exposes orthographic scale');
    assert(descriptor.origin.x === 0 && descriptor.origin.y === 0, 'descriptor exposes the artboard origin');
    assert(descriptor.ranges.horizontal[0] < 0 && descriptor.ranges.horizontal[1] > 0, 'descriptor exposes horizontal world range');
    const inverse = worldFromArtboardPoint({ descriptor, point: { x: 100, y: -100 } });
    assert(Math.abs(inverse.x - 50) < 1e-9 && Math.abs(inverse.z - 50) < 1e-9 && inverse.y === null, 'XZ inverse maps in-plane axes and leaves Y unknown');

    const ticks = buildCoordinateTicks({ descriptor, step: 10, pixelsPerArtboardUnit: 1 });
    assert(ticks.horizontal.ticks.some((tick) => tick.value === 0 && Math.abs(tick.position) < 1e-9), 'horizontal ticks include the origin');
    assert(ticks.horizontal.ticks.some((tick) => tick.value === 10 && Math.abs(tick.position - 20) < 1e-9), 'horizontal ticks honor positive X');
    assert(ticks.vertical.ticks.some((tick) => tick.value === 10 && Math.abs(tick.position + 20) < 1e-9), 'vertical ticks honor negative Z sign');
    const autoTicks = buildCoordinateTicks({ descriptor, step: null, pixelsPerArtboardUnit: 2 });
    assert(autoTicks.horizontal.step > 0 && Number.isFinite(autoTicks.horizontal.step), 'auto tick step is finite and positive');
    assert(niceStep(90, 6) >= 10 && niceStep(90, 6) <= 20, 'nice step chooses a 1/2/5 interval');

    const panels = quadPanelLayout(900, 900);
    assert(panels.length === 4 && panels.map((panel) => panel.projection).join(',') === '3d,xy,xz,yz', 'quad layout keeps 3D/XY/XZ/YZ order');
    const topLeft = panelAtPoint(panels, { x: -300, y: -300 });
    assert(topLeft?.projection === '3d', 'quad hit testing finds the 3D panel');
    const bottomRight = panelAtPoint(panels, { x: 300, y: 300 });
    assert(bottomRight?.projection === 'yz', 'quad hit testing finds the YZ panel');
    assert(panelAtPoint(panels, { x: 2000, y: 2000 }) === null, 'quad hit testing rejects points outside panels');
    const local = localPointInPanel({ x: 300, y: 300 }, bottomRight);
    assert(Math.abs(local.x - (300 - bottomRight.cx)) < 1e-9, 'local panel coordinates subtract the panel center');

    const doc = createDocument('parametric-surface', {});
    assert(JSON.stringify(doc.view.coordinates) === JSON.stringify(DEFAULT_COORDINATES), 'new documents carry default coordinate metadata');
    const legacyRaw = JSON.parse(JSON.stringify(doc));
    delete legacyRaw.view.coordinates;
    assert(JSON.stringify(sanitizeDocument(legacyRaw).view.coordinates) === JSON.stringify(DEFAULT_COORDINATES), 'legacy documents sanitize to coordinates off');
    doc.view.coordinates = sanitizeCoordinates({
      enabled: true, grid: false, cursor: true, step: 12.5, unitDisplay: 'physical',
    });
    const roundTrip = sanitizeDocument(JSON.parse(JSON.stringify(doc)));
    assert(roundTrip.view.coordinates.step === 12.5 && roundTrip.view.coordinates.unitDisplay === 'physical', 'coordinate settings round-trip');
    const beforeGeometry = JSON.stringify(evaluateDocument(doc, { time: 0 }).geometry[0].grid.points);
    doc.view.coordinates.enabled = false;
    const afterGeometry = JSON.stringify(evaluateDocument(doc, { time: 0 }).geometry[0].grid.points);
    assert(afterGeometry === beforeGeometry, 'coordinate settings never change geometry');
    assert(createCoordinates({ extra: true }).enabled === false, 'createCoordinates keeps unknown fields out of the contract');
  }
}
