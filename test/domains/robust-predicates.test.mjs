/**
 * robust-predicates.test.mjs — exact signs, tolerance, snapping and intersections.
 */

import {
  adaptiveTolerance,
  exactOrient2dSign,
  exactOrient3dSign,
  orient2dSign,
  orient3dSign,
  pointInTriangle2D,
  segmentsIntersect2D,
  snapPoint,
  snapRound,
  triangleTriangleIntersection,
} from '../../src/geometry/robustPredicates.js';

function p(x, y, z = 0) {
  return { x, y, z };
}

export function run(assert) {
  assert(orient2dSign(p(0, 0), p(1, 0), p(0, 1)) === 1, 'orient2d reports counter-clockwise');
  assert(orient2dSign(p(0, 0), p(0, 1), p(1, 0)) === -1, 'orient2d reports clockwise');
  assert(orient2dSign(p(0, 0), p(1, 1), p(2, 2)) === 0, 'orient2d reports collinear points as zero');
  assert(exactOrient2dSign(p(0, 0), p(1, 1), p(2, 2)) === 0, 'exact orient2d reports collinear integers');
  assert(exactOrient2dSign(p(0, 0), p(1, 0), p(0, 1)) === 1, 'exact orient2d matches a simple CCW triple');
  assert(exactOrient3dSign(p(0, 0, 0), p(1, 0, 0), p(0, 1, 0), p(0, 0, 1)) === 1, 'exact orient3d matches a positive tetrahedron');
  assert(exactOrient3dSign(p(0, 0, 0), p(1, 0, 0), p(0, 1, 0), p(1, 1, 0)) === 0, 'exact orient3d detects coplanarity');

  assert(orient3dSign(p(0, 0, 0), p(1, 0, 0), p(0, 1, 0), p(0, 0, 1)) === 1, 'orient3d reports a positive side');
  assert(orient3dSign(p(0, 0, 0), p(1, 0, 0), p(0, 1, 0), p(0, 0, -1)) === -1, 'orient3d reports a negative side');
  assert(orient3dSign(p(0, 0, 0), p(1, 0, 0), p(0, 1, 0), p(1, 1, 0)) === 0, 'orient3d reports coplanar points');
  assert(orient2dSign(p(NaN, 0), p(1, 0), p(0, 1)) === 0, 'non-finite 2D input is indeterminate');

  const tolerance = adaptiveTolerance([p(0, 0, 0), p(10, 0, 0)]);
  assert(tolerance.diagonal === 10, 'adaptive tolerance measures the bbox diagonal');
  assert(tolerance.epsilon > 0 && tolerance.epsilon < 1e-3, 'adaptive tolerance is positive and bounded');
  const clamped = adaptiveTolerance([p(0, 0, 0), p(1e9, 0, 0)], { ceiling: 1e-4 });
  assert(clamped.epsilon === 1e-4, 'adaptive tolerance respects the ceiling');
  const floor = adaptiveTolerance([p(0, 0, 0), p(1e-12, 0, 0)], { floor: 1e-9 });
  assert(floor.epsilon === 1e-9, 'adaptive tolerance respects the floor');
  const bbox = adaptiveTolerance({ min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } });
  assert(Math.abs(bbox.diagonal - Math.sqrt(12)) < 1e-12, 'adaptive tolerance accepts a bbox');

  assert(snapRound(1.26, 0.5) === 1.5 && snapRound(1.24, 0.5) === 1, 'snap rounding quantizes deterministically');
  assert(snapRound(3, 0) === 3 && snapRound(3, -1) === 3, 'invalid grids leave values unchanged');
  assert(JSON.stringify(snapPoint(p(1.26, -0.26, 0.76), 0.5)) === JSON.stringify(p(1.5, -0.5, 1)), 'snapPoint rounds every axis');

  assert(segmentsIntersect2D(p(0, 0), p(2, 2), p(0, 2), p(2, 0)), 'crossing segments intersect');
  assert(segmentsIntersect2D(p(0, 0), p(1, 1), p(1, 1), p(2, 0)), 'touching segments intersect');
  assert(segmentsIntersect2D(p(0, 0), p(2, 0), p(1, 0), p(3, 0)), 'collinear overlapping segments intersect');
  assert(!segmentsIntersect2D(p(0, 0), p(1, 0), p(0, 1), p(1, 1)), 'disjoint segments do not intersect');

  assert(pointInTriangle2D(p(0.2, 0.2), p(0, 0), p(1, 0), p(0, 1)), 'point inside a triangle is contained');
  assert(pointInTriangle2D(p(1, 0), p(0, 0), p(1, 0), p(0, 1)), 'point on an edge is contained');
  assert(!pointInTriangle2D(p(1, 1), p(0, 0), p(1, 0), p(0, 1)), 'point outside a triangle is rejected');

  const crossing = triangleTriangleIntersection(
    p(0, 0, 0), p(2, 0, 0), p(1, 2, 0),
    p(1, 1, -1), p(1, 1, 1), p(2, 1, 0),
  );
  assert(crossing?.kind === 'segment', 'crossing triangles produce a segment');
  assert(Number.isFinite(crossing.start.x) && Number.isFinite(crossing.end.x), 'intersection segment endpoints are finite');
  assert(crossing.start.z >= -1 && crossing.start.z <= 1, 'segment endpoints lie between the planes');

  const disjoint = triangleTriangleIntersection(
    p(0, 0, 0), p(1, 0, 0), p(0, 1, 0),
    p(10, 10, 0), p(11, 10, 0), p(10, 11, 0),
  );
  assert(disjoint === null, 'disjoint triangles return null');

  const coplanar = triangleTriangleIntersection(
    p(0, 0, 0), p(2, 0, 0), p(0, 2, 0),
    p(0.5, 0.5, 0), p(2.5, 0.5, 0), p(0.5, 2.5, 0),
  );
  assert(coplanar?.kind === 'coplanar', 'overlapping coplanar triangles are classified');
  const coplanarDisjoint = triangleTriangleIntersection(
    p(0, 0, 0), p(1, 0, 0), p(0, 1, 0),
    p(10, 10, 0), p(11, 10, 0), p(10, 11, 0),
  );
  assert(coplanarDisjoint === null, 'disjoint coplanar triangles return null');

  const before = JSON.stringify([p(0, 0, 0), p(1, 0, 0), p(0, 1, 0)]);
  orient2dSign(p(0, 0), p(1, 0), p(0, 1));
  triangleTriangleIntersection(p(0, 0, 0), p(1, 0, 0), p(0, 1, 0), p(0, 0, 1), p(1, 0, 1), p(0, 1, 1));
  assert(JSON.stringify([p(0, 0, 0), p(1, 0, 0), p(0, 1, 0)]) === before, 'kernel does not mutate inputs');
}
