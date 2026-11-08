/**
 * geometry/latticeSolid.js — turn a lattice strut network into one solid.
 *
 * Every Curve3D becomes a closed tube. A solid floor and a rim ring close the
 * ends, then Manifold unions everything into a single watertight body. The
 * builder never mutates the input curves.
 */

import { createMesh, isCurve3D } from './contracts.js';
import { booleanSolids } from './csg.js';
import { validateMesh } from './validate.js';
import { repairMesh } from './repair.js';
import { mergeMeshes } from './solidPrep.js';
import { buildLocalJointSdf } from './latticeJointBlend.js';

const TWO_PI = Math.PI * 2;

const FINISH_PROFILES = Object.freeze({
  draft: {
    radialSegments: 8,
    jointSlices: 8,
    jointScale: 1.2,
    refinement: { tolerance: 0.3, minSamples: 2, maxSamples: 6, maxPoints: 80_000 },
  },
  standard: {
    radialSegments: 10,
    jointSlices: 12,
    jointScale: 1.5,
    refinement: { tolerance: 0.15, minSamples: 4, maxSamples: 10, maxPoints: 240_000 },
  },
  high: {
    radialSegments: 12,
    jointSlices: 12,
    jointScale: 1.28,
    refinement: { tolerance: 0.1, minSamples: 5, maxSamples: 12, maxPoints: 600_000 },
  },
});

export function buildLatticeSolid(curves, {
  strut = 3.5,
  floor = 3,
  rim = 4,
  height = null,
  radialSegments = null,
  tolerance = 1e-4,
  finishQuality = 'standard',
  jointStyle = 'technical',
  jointScale = null,
  blendBudget = 24,
  blendEdgeLength = null,
  blendMaxAngle = 150,
  curveStyle = 'polyline',
  envelope = 'centerline',
  radiusProfile = 'constant',
  taper = 0.85,
  radiusAt = null,
  refinementTolerance = null,
  refinementPointBudget = null,
  openingValidation = 'capsule',
  openings = [],
  minOpeningWidth = null,
  specHash = null,
  networkHash = null,
  algorithmVersion = null,
} = {}) {
  const started = now();
  const finish = FINISH_PROFILES[finishQuality] ?? FINISH_PROFILES.standard;
  const baseRadius = Math.max(0.2, (Number(strut) || 3.5) / 2);
  const floorHeight = Math.max(0, Number(floor) || 0);
  const rimWidth = Math.max(baseRadius, (Number(rim) || 4) / 2);
  const sides = Number.isFinite(Number(radialSegments)) && Number(radialSegments) >= 3
    ? Math.max(3, Math.min(32, Math.round(Number(radialSegments))))
    : finish.radialSegments;
  const source = (Array.isArray(curves) ? curves : [])
    .filter((curve) => isCurve3D(curve) && Array.isArray(curve.points) && curve.points.length >= 2);

  if (!source.length) {
    return { ok: false, geometry: null, error: { code: 'empty-network', message: 'lattice network has no curves' } };
  }

  const inferredHeight = source.reduce((max, curve) => {
    for (const point of curve.points) max = Math.max(max, Number(point?.z) || 0);
    return max;
  }, 0);
  const surfaceHeight = Math.max(1, Number(height) || inferredHeight || 200);
  const hasSurfaceProfile = typeof radiusAt === 'function';
  const radiusFn = hasSurfaceProfile
    ? (z) => {
      const value = Number(radiusAt(Math.max(0, Math.min(1, z / surfaceHeight))));
      return Number.isFinite(value) && value > 1e-6 ? value : 1e-6;
    }
    : null;
  const curveFallback = curveStyle === 'organic' && !hasSurfaceProfile;
  const resolvedCurveStyle = curveFallback ? 'polyline' : curveStyle;
  const refinement = {
    tolerance: Number.isFinite(Number(refinementTolerance)) && Number(refinementTolerance) > 0
      ? Number(refinementTolerance)
      : finish.refinement.tolerance,
    minSamples: finish.refinement.minSamples,
    maxSamples: finish.refinement.maxSamples,
    maxPoints: Number.isFinite(Number(refinementPointBudget)) && Number(refinementPointBudget) > 0
      ? Math.round(Number(refinementPointBudget))
      : finish.refinement.maxPoints,
  };
  const pointBudget = { used: 0, max: refinement.maxPoints };

  const entries = source.map((curve) => {
    if (resolvedCurveStyle !== 'organic') {
      return {
        curve,
        points: shiftPolyline(curve.points, envelope, baseRadius),
        refinement: null,
      };
    }
    const organic = organicCenterline(curve.points, {
      radiusAt: radiusFn,
      envelope,
      strutRadius: baseRadius,
      refinement,
      budget: pointBudget,
    });
    return { curve, points: organic.points, refinement: organic };
  });
  const refined = entries.filter((entry) => entry.refinement);
  const refinementStats = refined.length
    ? {
      tolerance: refinement.tolerance,
      maxChordDeviation: refined.reduce((max, entry) => Math.max(max, entry.refinement.maxChordDeviation), 0),
      surfaceDeviation: refined.reduce((max, entry) => Math.max(max, entry.refinement.surfaceDeviation), 0),
      meanSamples: refined.reduce((sum, entry) => sum + entry.refinement.samples, 0) / refined.length,
      pointCount: refined.reduce((sum, entry) => sum + entry.refinement.samples, 0),
      budgetPoints: refinement.maxPoints,
      budgetExceeded: pointBudget.used > refinement.maxPoints,
      curveFallback,
    }
    : {
      tolerance: refinement.tolerance,
      maxChordDeviation: null,
      surfaceDeviation: null,
      meanSamples: 0,
      pointCount: 0,
      budgetPoints: refinement.maxPoints,
      budgetExceeded: false,
      curveFallback,
    };

  const tubes = [];
  let tubeTriangles = 0;
  for (let i = 0; i < entries.length; i++) {
    const tube = tubeMesh(entries[i].points, baseRadius, sides, `lattice-strut-${i}`, {
      radiusProfile,
      taper,
    });
    if (!tube) continue;
    tubes.push(tube);
    tubeTriangles += tube.faces.length;
  }
  if (!tubes.length) {
    return { ok: false, geometry: null, error: { code: 'empty-network', message: 'lattice network produced no struts' } };
  }

  const resolvedJointScale = Number.isFinite(Number(jointScale)) && Number(jointScale) > 0
    ? Number(jointScale)
    : finish.jointScale;
  const jointPoints = entries.map((entry) => entry.points);
  const sdfJointSet = jointStyle === 'blend'
    ? buildSdfJointMeshes(jointPoints, baseRadius, {
      budget: blendBudget,
      blendRadius: Math.max(0.25, baseRadius * 0.35),
      edgeLength: Number.isFinite(Number(blendEdgeLength)) && Number(blendEdgeLength) > 0
        ? Number(blendEdgeLength)
        : Math.max(0.25, baseRadius * 0.22),
      jointScale: resolvedJointScale,
      maxAngle: blendMaxAngle,
    })
    : null;
  let joints = jointSpheresMesh(jointPoints, baseRadius, sides, {
    jointStyle,
    jointScale: resolvedJointScale,
    jointSlices: finish.jointSlices,
    onlyKeys: sdfJointSet?.fallbackKeys?.size ? sdfJointSet.fallbackKeys : null,
  });
  let jointMeshes = [joints, sdfJointSet?.mesh].filter(Boolean);
  const floorMesh = floorSolid(entries.map((entry) => ({ points: entry.points })), baseRadius, floorHeight);
  const rimMesh = rimSolid(entries.map((entry) => ({ points: entry.points })), surfaceHeight, baseRadius, rimWidth);
  let operands = [floorMesh, rimMesh, ...jointMeshes, ...tubes].filter(Boolean);
  let result = booleanSolids('union', operands, {
    strategy: 'manifold',
    tolerance,
    maxInputTriangles: 600_000,
  });
  let jointFallback = sdfJointSet?.fallbackKeys?.size ? 'sdf-budget-fallback' : null;
  if (!result.ok || result.empty || !result.geometry) {
    const styleCandidates = jointStyle === 'technical'
      ? ['rounded', 'technical']
      : [jointStyle === 'auto' ? 'rounded' : jointStyle, 'technical', 'rounded'];
    const scaleCandidates = [...new Set([
      resolvedJointScale,
      1.6,
      1.5,
      1.4,
      1.35,
      1.3,
      1.25,
      1.2,
      1.15,
      1.1,
      1.0,
    ].map((value) => Math.round(value * 100) / 100))];
    let retried = false;
    for (const style of styleCandidates) {
      for (const scale of scaleCandidates) {
        if (style === jointStyle && scale === resolvedJointScale) continue;
        const candidate = jointSpheresMesh(jointPoints, baseRadius, sides, {
          jointStyle: style,
          jointScale: scale,
          jointSlices: finish.jointSlices,
        });
        const retryOperands = [floorMesh, rimMesh, candidate, ...tubes].filter(Boolean);
        const retry = booleanSolids('union', retryOperands, {
          strategy: 'manifold',
          tolerance,
          maxInputTriangles: 600_000,
        });
        if (retry.ok && retry.geometry) {
          joints = candidate;
          operands = retryOperands;
          result = retry;
          jointFallback = jointStyle === 'blend'
            ? `blend-to-${style}@${scale}`
            : (style === jointStyle ? `joint-scale-${scale}` : `${jointStyle}-to-${style}@${scale}`);
          retried = true;
          break;
        }
      }
      if (retried) break;
    }
  }
  if (result.empty || !result.geometry) {
    return {
      ok: false,
      geometry: null,
      error: result.error ?? { code: 'empty-result', message: 'lattice union produced an empty body' },
      stats: { struts: tubes.length, operands: operands.length, tubeTriangles, finishQuality },
    };
  }
  let geometry = result.geometry;
  let validation = result.validation ?? validateMesh(geometry);
  let microCaps = 0;
  let orientationRepaired = false;
  if (!validation.ok) {
    const repaired = repairMesh(geometry, {
      tolerance: Math.max(1e-4, tolerance),
      capStrategy: 'auto',
      orient: true,
      topology: 'split',
    });
    if (repaired.validation?.ok) {
      geometry = repaired.mesh;
      validation = repaired.validation;
      orientationRepaired = repaired.report?.changed === true;
    }
  }
  if (!validation.ok) {
    const capped = capMicroHoles(geometry, Math.max(0.1, tolerance * 10));
    if (capped.caps > 0) {
      geometry = capped.mesh;
      validation = validateMesh(geometry);
      microCaps = capped.caps;
    }
  }
  if (!validation.ok) {
    return {
      ok: false,
      geometry: null,
      error: { code: 'invalid-result', message: validation.errors[0] ?? 'lattice union failed validation' },
      stats: { struts: tubes.length, operands: operands.length, tubeTriangles, finishQuality },
    };
  }

  const sphereJointCount = joints?.meta?.jointCount ?? 0;
  const sdfJointCount = sdfJointSet?.blended ?? 0;
  const jointCount = sphereJointCount + sdfJointCount;
  const jointRadius = joints?.meta?.jointRadius ?? baseRadius;
  const requestedBlend = jointStyle === 'blend';
  const hasSdfJoints = sdfJointCount > 0 && jointFallback !== 'blend-to-rounded';
  const actualJointStyle = hasSdfJoints ? 'blend' : (jointFallback ? 'rounded' : jointStyle);
  const jointMethod = hasSdfJoints ? 'sdf-levelset' : (actualJointStyle === 'technical' ? 'technical' : 'rounded');
  const gaugeStarted = now();
  const measured = measureOpeningClearance(geometry, openings, {
    minOpeningWidth,
    strutDiameter: baseRadius * 2,
    cellSize: Math.max(4, (Number(minOpeningWidth) || 4) * 2),
    validation: openingValidation,
    maxOpenings: finishQuality === 'draft' ? 64 : null,
  });
  const gaugeMs = Math.round(now() - gaugeStarted);
  const minRadius = radiusProfile === 'taper'
    ? baseRadius * Math.max(0.1, Math.min(1, Number(taper) || 1))
    : baseRadius;

  return {
    ok: true,
    geometry,
    validation,
    stats: {
      struts: tubes.length,
      joints: jointCount,
      blendedJoints: sdfJointCount,
      fallbackJoints: sdfJointSet?.fallbackKeys?.size ?? (requestedBlend ? jointCount : 0),
      jointMethod,
      sdfJoints: sdfJointSet
        ? {
          budget: Math.max(0, Math.round(Number(blendBudget) || 0)),
          processed: sdfJointSet.processed,
          blended: sdfJointSet.blended,
          failed: sdfJointSet.failed,
          fallback: sdfJointSet.fallbackKeys.size,
          total: sdfJointSet.total,
          eligible: sdfJointSet.eligible,
          maxAngle: sdfJointSet.maxAngle,
          edgeLength: sdfJointSet.edgeLength,
        }
        : null,
      jointStyle: actualJointStyle,
      requestedJointStyle: jointStyle,
      jointFallback,
      jointRadius,
      curveStyle: resolvedCurveStyle,
      requestedCurveStyle: curveStyle,
      curveFallback,
      envelope,
      finishQuality,
      radiusProfile,
      operands: operands.length,
      tubeTriangles,
      triangles: geometry.faces.length,
      vertices: geometry.vertices.length,
      strategy: result.stats?.strategy ?? 'manifold',
      volume: validation.meta?.volume ?? null,
      microCaps,
      orientationRepaired,
      manifoldGuaranteed: Boolean(validation.meta?.manifold) && !microCaps && !orientationRepaired,
      radius: baseRadius,
      minStrutDiameter: minRadius * 2,
      minJointDiameter: jointRadius * 2,
      openingTargetWidth: Number.isFinite(Number(minOpeningWidth)) ? Number(minOpeningWidth) : null,
      openingGauge: measured,
      gaugeMs,
      buildMs: Math.round(now() - started),
      refinement: refinementStats,
      floor: floorHeight,
      rim: rimWidth,
      specHash,
      networkHash,
      algorithmVersion,
      provenance: {
        specHash,
        networkHash,
        algorithmVersion,
        jointStyle: actualJointStyle,
        requestedJointStyle: jointStyle,
        jointFallback,
        jointMethod,
        finishQuality,
        curveStyle: resolvedCurveStyle,
        curveFallback,
        envelope,
        refinementTolerance: refinement.tolerance,
      },
    },
  };
}

/**
 * Closed tube swept along a polyline with parallel-transport frames.
 * `radius` may be a number or a function of normalized path position.
 */
export function tubeMesh(points, radius, radialSegments = 8, id = 'lattice-strut', options = {}) {
  const path = dedupePoints(points);
  if (path.length < 2) return null;
  const baseRadius = typeof radius === 'function' ? null : Math.max(0.05, Number(radius) || 1);
  const radiusProfile = options.radiusProfile === 'taper' ? 'taper' : 'constant';
  const taper = Math.max(0.1, Math.min(1, Number(options.taper) || 1));
  const radiusAt = (index) => {
    if (typeof radius === 'function') {
      const value = Number(radius(path.length > 1 ? index / (path.length - 1) : 0));
      return Math.max(0.05, Number.isFinite(value) ? value : 1);
    }
    if (radiusProfile === 'taper') {
      return baseRadius * (1 - (1 - taper) * (index / Math.max(1, path.length - 1)));
    }
    return baseRadius;
  };
  const tangents = path.map((_, index) => {
    const a = path[Math.max(0, index - 1)];
    const b = path[Math.min(path.length - 1, index + 1)];
    return normalize({
      x: b.x - a.x,
      y: b.y - a.y,
      z: b.z - a.z,
    }) ?? { x: 0, y: 0, z: 1 };
  });
  const sides = Math.max(3, Math.floor(radialSegments) || 8);
  const normals = [];
  let normal = perpendicular(tangents[0]);
  for (let i = 0; i < path.length; i++) {
    if (i > 0) {
      const projected = subtract(normal, scale(tangents[i], dot(normal, tangents[i])));
      normal = normalize(projected) ?? perpendicular(tangents[i]);
    }
    normals.push(normal);
  }
  const vertices = [];
  for (let i = 0; i < path.length; i++) {
    const ringRadius = radiusAt(i);
    const normalI = normals[i];
    const binormal = normalize(cross(tangents[i], normalI)) ?? perpendicular(tangents[i]);
    for (let k = 0; k < sides; k++) {
      const angle = (TWO_PI * k) / sides;
      vertices.push({
        x: path[i].x + ringRadius * (Math.cos(angle) * normalI.x + Math.sin(angle) * binormal.x),
        y: path[i].y + ringRadius * (Math.cos(angle) * normalI.y + Math.sin(angle) * binormal.y),
        z: path[i].z + ringRadius * (Math.cos(angle) * normalI.z + Math.sin(angle) * binormal.z),
      });
    }
  }
  const faces = [];
  for (let i = 0; i < path.length - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const next = (k + 1) % sides;
      const a = i * sides + k;
      const b = i * sides + next;
      const c = (i + 1) * sides + next;
      const d = (i + 1) * sides + k;
      faces.push([a, b, c, d]);
    }
  }
  const startCenter = vertices.length;
  vertices.push({ ...path[0] });
  const endCenter = vertices.length;
  vertices.push({ ...path[path.length - 1] });
  for (let k = 0; k < sides; k++) {
    const next = (k + 1) % sides;
    faces.push([startCenter, next, k]);
    const base = (path.length - 1) * sides;
    faces.push([endCenter, base + k, base + next]);
  }
  const mesh = createMesh({ id, vertices, faces, meta: { source: 'lattice-strut' } });
  const validation = validateMesh(mesh);
  if ((validation.meta?.volume ?? 0) < 0) {
    mesh.faces = mesh.faces.map((face) => [...face].reverse());
    mesh.meta = { ...mesh.meta, flipped: true };
  }
  return mesh;
}

function collectJointNodes(polylines, radius, jointScale) {
  const points = [];
  const seen = new Map();
  const degree = new Map();
  const branches = new Map();
  const keyOf = (point) => `${Math.round(point.x * 100)}:${Math.round(point.y * 100)}:${Math.round(point.z * 100)}`;
  const add = (point) => {
    if (!point) return null;
    const key = keyOf(point);
    if (!seen.has(key)) {
      seen.set(key, points.length);
      points.push(point);
      degree.set(key, 0);
      branches.set(key, []);
    }
    degree.set(key, (degree.get(key) ?? 0) + 1);
    return key;
  };
  for (const pointsOfCurve of polylines) {
    if (!pointsOfCurve?.length) continue;
    const first = pointsOfCurve[0];
    const second = pointsOfCurve[1];
    const last = pointsOfCurve[pointsOfCurve.length - 1];
    const beforeLast = pointsOfCurve[pointsOfCurve.length - 2];
    const firstKey = add(first);
    const lastKey = add(last);
    if (firstKey && second) branches.get(firstKey).push({ a: first, b: second });
    if (lastKey && beforeLast) branches.get(lastKey).push({ a: last, b: beforeLast });
  }
  const minDistance = radius * jointScale * 2.15;
  const accepted = [];
  for (const [key, index] of seen.entries()) {
    if ((degree.get(key) ?? 0) < 3) continue;
    const center = points[index];
    if (accepted.some((node) => Math.hypot(
      center.x - node.center.x,
      center.y - node.center.y,
      center.z - node.center.z,
    ) < minDistance)) continue;
    const nodeBranches = branches.get(key) ?? [];
    accepted.push({ key, center, branches: nodeBranches, minAngle: minBranchAngle(center, nodeBranches) });
  }
  return { nodes: accepted, points };
}

function buildSdfJointMeshes(polylines, radius, {
  budget = 24,
  blendRadius = 0.6,
  edgeLength = 0.4,
  jointScale = 1.25,
  maxAngle = 150,
} = {}) {
  const data = collectJointNodes(polylines, radius, jointScale);
  const fallbackKeys = new Set();
  const meshes = [];
  let blended = 0;
  let failed = 0;
  let processed = 0;
  const limit = Math.max(0, Math.round(Number(budget) || 0));
  const eligible = data.nodes
    .filter((node) => node.minAngle <= maxAngle)
    .sort((a, b) => a.minAngle - b.minAngle);
  for (const node of eligible) {
    if (processed >= limit) {
      fallbackKeys.add(node.key);
      continue;
    }
    processed += 1;
    const result = buildLocalJointSdf({
      branches: node.branches.map((branch) => ({ ...branch, radius })),
      blendRadius,
      edgeLength,
    });
    if (result.ok && result.geometry) {
      meshes.push(result.geometry);
      blended += 1;
    } else {
      fallbackKeys.add(node.key);
      failed += 1;
    }
  }
  let mesh = null;
  if (meshes.length) {
    const merged = mergeMeshes(meshes, { id: 'lattice-sdf-joints' });
    mesh = merged.mesh;
    if (!mesh) {
      blended = 0;
      for (const node of data.nodes) fallbackKeys.add(node.key);
    }
  }
  return {
    mesh,
    blended,
    failed,
    processed,
    fallbackKeys,
    total: data.nodes.length,
    eligible: eligible.length,
    maxAngle,
    edgeLength,
  };
}

function minBranchAngle(center, branches) {
  if (!Array.isArray(branches) || branches.length < 2) return 180;
  const vectors = branches.map((branch) => {
    const dx = branch.b.x - center.x;
    const dy = branch.b.y - center.y;
    const dz = branch.b.z - center.z;
    const length = Math.hypot(dx, dy, dz);
    return length > 1e-9 ? { x: dx / length, y: dy / length, z: dz / length } : null;
  }).filter(Boolean);
  let min = 180;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const dot = Math.max(-1, Math.min(1, vectors[i].x * vectors[j].x + vectors[i].y * vectors[j].y + vectors[i].z * vectors[j].z));
      min = Math.min(min, Math.acos(dot) * 180 / Math.PI);
    }
  }
  return min;
}

function jointSpheresMesh(polylines, radius, slices, {
  jointStyle = 'technical',
  jointScale = 1.3,
  jointSlices = 12,
  onlyKeys = null,
} = {}) {
  const vertices = [];
  const faces = [];
  let count = 0;
  const requested = jointStyle === 'technical' ? 1.2 : jointScale;
  const sphereRadius = radius * requested;
  const sphereSlices = Math.max(5, Math.round(jointSlices));
  const sphereStacks = Math.max(4, Math.round(sphereSlices * 0.7));
  const data = collectJointNodes(polylines, radius, requested);
  for (const node of data.nodes) {
    if (onlyKeys && !onlyKeys.has(node.key)) continue;
    appendSphere(vertices, faces, node.center, sphereRadius, sphereSlices, sphereStacks);
    count += 1;
  }
  if (!faces.length) return null;
  const mesh = createMesh({
    id: 'lattice-joints',
    vertices,
    faces,
    meta: {
      source: 'lattice-joints',
      jointCount: count,
      jointRadius: sphereRadius,
      jointStyle,
    },
  });
  return orientMesh(mesh);
}

function organicCenterline(points, {
  radiusAt,
  envelope,
  strutRadius,
  refinement,
  budget,
}) {
  const surfacePoints = toSurfaceCoordinates(points, radiusAt);
  if (surfacePoints.length < 2) {
    return {
      points,
      maxChordDeviation: null,
      surfaceDeviation: null,
      samples: 0,
    };
  }
  const angularScale = Math.max(1, meanRadiusOf(points));
  const out = [];
  let maxChordDeviation = 0;
  for (let i = 0; i < surfacePoints.length - 1; i++) {
    const p0 = surfacePoints[Math.max(0, i - 1)];
    const p1 = surfacePoints[i];
    const p2 = surfacePoints[i + 1];
    const p3 = surfacePoints[Math.min(surfacePoints.length - 1, i + 2)];
    const evaluate = (t) => {
      const [theta, z, radius] = catmullRomCentripetal(p0, p1, p2, p3, t, angularScale);
      return surfacePoint(theta, z, radius, radiusAt, envelope, strutRadius);
    };
    const adaptive = adaptiveSegment(evaluate, refinement, budget);
    maxChordDeviation = Math.max(maxChordDeviation, adaptive.maxDeviation);
    for (let step = 0; step < adaptive.samples.length - 1; step++) {
      out.push(adaptive.samples[step]);
    }
  }
  if (budget) budget.used += out.length + 1;
  const last = surfacePoints[surfacePoints.length - 1];
  out.push(surfacePoint(last[0], last[1], last[2], radiusAt, envelope, strutRadius));
  let surfaceDeviation = 0;
  if (radiusAt) {
    for (const point of out) {
      const expected = Math.max(1e-6, radiusAt(point.z) - (envelope === 'outer' ? strutRadius : 0));
      surfaceDeviation = Math.max(surfaceDeviation, Math.abs(Math.hypot(point.x, point.y) - expected));
    }
  }
  return {
    points: out,
    maxChordDeviation,
    surfaceDeviation,
    samples: out.length,
  };
}

function adaptiveSegment(evaluate, { tolerance, minSamples, maxSamples }, budget = null) {
  const minimum = Math.max(1, Math.round(minSamples) || 1);
  const maximum = Math.max(minimum, Math.round(maxSamples) || minimum);
  const values = Array.from({ length: minimum + 1 }, (_, index) => index / minimum);
  const deviation = (a, b) => {
    const pointA = evaluate(a);
    const pointB = evaluate(b);
    const mid = evaluate((a + b) / 2);
    const chord = {
      x: (pointA.x + pointB.x) / 2,
      y: (pointA.y + pointB.y) / 2,
      z: (pointA.z + pointB.z) / 2,
    };
    return Math.hypot(mid.x - chord.x, mid.y - chord.y, mid.z - chord.z);
  };
  while (values.length - 1 < maximum) {
    let worstIndex = -1;
    let worst = 0;
    for (let i = 0; i < values.length - 1; i++) {
      const value = deviation(values[i], values[i + 1]);
      if (value > worst) {
        worst = value;
        worstIndex = i;
      }
    }
    if (worstIndex < 0 || worst <= tolerance) break;
    if (budget && budget.used + values.length >= budget.max) break;
    values.splice(worstIndex + 1, 0, (values[worstIndex] + values[worstIndex + 1]) / 2);
  }
  let maxDeviation = 0;
  for (let i = 0; i < values.length - 1; i++) {
    maxDeviation = Math.max(maxDeviation, deviation(values[i], values[i + 1]));
  }
  return {
    samples: values.map((t) => evaluate(t)),
    maxDeviation,
  };
}

function toSurfaceCoordinates(points, radiusAt) {
  const out = [];
  let previousTheta = null;
  for (const point of points) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || !Number.isFinite(point?.z)) continue;
    let theta = Math.atan2(point.y, point.x);
    if (previousTheta !== null) {
      while (theta - previousTheta > Math.PI) theta -= TWO_PI;
      while (theta - previousTheta < -Math.PI) theta += TWO_PI;
    }
    previousTheta = theta;
    const measured = Math.hypot(point.x, point.y);
    const sampled = radiusAt ? radiusAt(point.z) : measured;
    const radius = Number.isFinite(sampled) && sampled > 1e-6 ? sampled : measured;
    if (!Number.isFinite(radius) || radius < 1e-9) continue;
    out.push([theta, point.z, radius]);
  }
  return out;
}

function catmullRomCentripetal(p0, p1, p2, p3, t, angularScale) {
  const knot = (a, b, base) => base + Math.max(
    1e-6,
    Math.pow(Math.hypot((b[0] - a[0]) * angularScale, b[1] - a[1]), 0.5),
  );
  const t0 = 0;
  const t1 = knot(p0, p1, 0);
  const t2 = knot(p1, p2, t1);
  const t3 = knot(p2, p3, t2);
  const tt = t1 + (t2 - t1) * Math.max(0, Math.min(1, t));
  const mix = (a, b, ta, tb) => {
    const span = tb - ta;
    const u = Math.abs(span) < 1e-9 ? 0 : (tt - ta) / span;
    return [
      a[0] + (b[0] - a[0]) * u,
      a[1] + (b[1] - a[1]) * u,
      a[2] + (b[2] - a[2]) * u,
    ];
  };
  const a1 = mix(p0, p1, t0, t1);
  const a2 = mix(p1, p2, t1, t2);
  const a3 = mix(p2, p3, t2, t3);
  const b1 = mix(a1, a2, t0, t2);
  const b2 = mix(a2, a3, t1, t3);
  const point = mix(b1, b2, t1, t2);
  return [point[0], point[1], point[2]];
}

function surfacePoint(theta, z, measuredRadius, radiusAt, envelope, strutRadius) {
  const sampled = radiusAt ? Number(radiusAt(z)) : NaN;
  const surface = Math.max(1e-6, Number.isFinite(sampled) && sampled > 1e-6 ? sampled : measuredRadius);
  const radius = envelope === 'outer' ? Math.max(1e-6, surface - strutRadius) : surface;
  return {
    x: radius * Math.cos(theta),
    y: radius * Math.sin(theta),
    z,
  };
}

function shiftPolyline(points, envelope, strutRadius) {
  if (envelope !== 'outer') return points.map((point) => ({ x: point.x, y: point.y, z: point.z }));
  return points.map((point) => {
    const radius = Math.hypot(point.x, point.y);
    if (radius < 1e-9) return { x: point.x, y: point.y, z: point.z };
    const shifted = Math.max(1e-6, radius - strutRadius);
    return {
      x: (point.x / radius) * shifted,
      y: (point.y / radius) * shifted,
      z: point.z,
    };
  });
}

function meanRadiusOf(points) {
  let total = 0;
  let count = 0;
  for (const point of points) {
    const radius = Math.hypot(point.x, point.y);
    if (Number.isFinite(radius)) {
      total += radius;
      count += 1;
    }
  }
  return count ? total / count : 1;
}

function measureOpeningClearance(mesh, openings, {
  minOpeningWidth = null,
  strutDiameter = 3.5,
  cellSize = 8,
  validation = 'capsule',
  maxOpenings = null,
} = {}) {
  const all = (Array.isArray(openings) ? openings : [])
    .filter((opening) => Number.isFinite(opening?.x) && Number.isFinite(opening?.y) && Number.isFinite(opening?.z));
  if (!all.length || !mesh?.vertices?.length || !mesh?.faces?.length) return null;
  const limit = Number.isFinite(Number(maxOpenings)) && Number(maxOpenings) > 0
    ? Math.min(all.length, Math.floor(Number(maxOpenings)))
    : all.length;
  const list = all.slice(0, limit);
  const triangles = buildTriangleGrid(mesh, cellSize);
  if (!triangles.count) return null;
  const target = Number(minOpeningWidth);
  const span = Math.max(
    Math.max(2, Number(strutDiameter) || 3.5) * 2,
    Number.isFinite(target) && target > 0 ? target * 4 : 8,
  );
  const samples = validation === 'estimate' ? 1 : 5;
  let min = Infinity;
  let max = 0;
  let total = 0;
  let below = 0;
  for (const opening of list) {
    const radial = Math.hypot(opening.x, opening.y);
    const normal = radial > 1e-9
      ? { x: opening.x / radial, y: opening.y / radial, z: 0 }
      : { x: 0, y: 0, z: 1 };
    let radius = Infinity;
    for (let i = 0; i < samples; i++) {
      const offset = -span / 2 + (span * i) / (samples - 1);
      const point = {
        x: opening.x + normal.x * offset,
        y: opening.y + normal.y * offset,
        z: opening.z + normal.z * offset,
      };
      radius = Math.min(radius, nearestTriangleDistance(triangles, point, cellSize));
    }
    const width = Number.isFinite(radius) ? radius * 2 : 0;
    min = Math.min(min, width);
    max = Math.max(max, width);
    total += width;
    if (Number.isFinite(target) && target > 0 && width + 1e-6 < target) below += 1;
  }
  return {
    method: validation === 'estimate' ? 'estimate' : 'capsule-sampled',
    samplesPerOpening: samples,
    span,
    count: list.length,
    checkedCount: list.length,
    skippedCount: all.length - list.length,
    totalCount: all.length,
    minWidth: Number.isFinite(min) ? min : 0,
    maxWidth: max,
    meanWidth: total / list.length,
    belowTarget: below,
  };
}

function buildTriangleGrid(mesh, cellSize) {
  const size = Math.max(2, Number(cellSize) || 8);
  const cells = new Map();
  const vertices = mesh.vertices;
  const faces = mesh.faces;
  let count = 0;
  const keyOf = (x, y, z) => `${x}:${y}:${z}`;
  for (const face of faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    const a = vertices[face[0]];
    const b = vertices[face[1]];
    const c = vertices[face[2]];
    if (!a || !b || !c) continue;
    const tri = { a, b, c };
    const index = count++;
    const minX = Math.floor(Math.min(a.x, b.x, c.x) / size);
    const maxX = Math.floor(Math.max(a.x, b.x, c.x) / size);
    const minY = Math.floor(Math.min(a.y, b.y, c.y) / size);
    const maxY = Math.floor(Math.max(a.y, b.y, c.y) / size);
    const minZ = Math.floor(Math.min(a.z, b.z, c.z) / size);
    const maxZ = Math.floor(Math.max(a.z, b.z, c.z) / size);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = keyOf(x, y, z);
          const bucket = cells.get(key);
          if (bucket) bucket.push(tri);
          else cells.set(key, [tri]);
        }
      }
    }
    void index;
  }
  return { cells, size, count };
}

function nearestTriangleDistance(grid, point, cellSize) {
  const size = grid.size || cellSize || 8;
  const cx = Math.floor(point.x / size);
  const cy = Math.floor(point.y / size);
  const cz = Math.floor(point.z / size);
  let best = Infinity;
  for (let ring = 0; ring <= 4; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dz = -ring; dz <= ring; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== ring) continue;
          const bucket = grid.cells.get(`${cx + dx}:${cy + dy}:${cz + dz}`);
          if (!bucket) continue;
          for (const triangle of bucket) {
            best = Math.min(best, pointTriangleDistance(point, triangle.a, triangle.b, triangle.c));
          }
        }
      }
    }
    if (Number.isFinite(best) && ring >= 1) break;
  }
  return best;
}

function pointTriangleDistance(point, a, b, c) {
  const ab = subtract(b, a);
  const ac = subtract(c, a);
  const ap = subtract(point, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return Math.hypot(ap.x, ap.y, ap.z);
  const bp = subtract(point, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return Math.hypot(bp.x, bp.y, bp.z);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return distanceToPoint(point, a, ab, v);
  }
  const cp = subtract(point, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return Math.hypot(cp.x, cp.y, cp.z);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return distanceToPoint(point, a, ac, w);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    const edge = subtract(c, b);
    return distanceToPoint(point, b, edge, w);
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  const closest = {
    x: a.x + ab.x * v + ac.x * w,
    y: a.y + ab.y * v + ac.y * w,
    z: a.z + ab.z * v + ac.z * w,
  };
  return Math.hypot(point.x - closest.x, point.y - closest.y, point.z - closest.z);
}

function distanceToPoint(point, origin, edge, t) {
  const closest = {
    x: origin.x + edge.x * t,
    y: origin.y + edge.y * t,
    z: origin.z + edge.z * t,
  };
  return Math.hypot(point.x - closest.x, point.y - closest.y, point.z - closest.z);
}

function appendSphere(vertices, faces, center, radius, slices, stacks) {
  const base = vertices.length;
  vertices.push({ x: center.x, y: center.y, z: center.z + radius });
  for (let i = 1; i < stacks; i++) {
    const phi = (Math.PI * i) / stacks;
    const r = radius * Math.sin(phi);
    const z = center.z + radius * Math.cos(phi);
    for (let j = 0; j < slices; j++) {
      const theta = (TWO_PI * j) / slices;
      vertices.push({ x: center.x + r * Math.cos(theta), y: center.y + r * Math.sin(theta), z });
    }
  }
  const bottom = vertices.length;
  vertices.push({ x: center.x, y: center.y, z: center.z - radius });
  for (let j = 0; j < slices; j++) {
    const next = (j + 1) % slices;
    faces.push([base, base + 1 + j, base + 1 + next]);
  }
  for (let i = 0; i < stacks - 2; i++) {
    const row = base + 1 + i * slices;
    const nextRow = row + slices;
    for (let j = 0; j < slices; j++) {
      const next = (j + 1) % slices;
      faces.push([row + j, nextRow + j, nextRow + next, row + next]);
    }
  }
  const lastRow = base + 1 + (stacks - 2) * slices;
  for (let j = 0; j < slices; j++) {
    const next = (j + 1) % slices;
    faces.push([bottom, lastRow + next, lastRow + j]);
  }
}

function capMicroHoles(mesh, maxPerimeter) {
  const edges = new Map();
  for (const face of mesh.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const entry = edges.get(key) ?? { count: 0, a: Math.min(a, b), b: Math.max(a, b) };
      entry.count += 1;
      edges.set(key, entry);
    }
  }
  const boundary = [...edges.values()].filter((edge) => edge.count === 1);
  if (!boundary.length) return { mesh, caps: 0 };
  const incident = new Map();
  boundary.forEach((edge, index) => {
    for (const vertex of [edge.a, edge.b]) {
      if (!incident.has(vertex)) incident.set(vertex, []);
      incident.get(vertex).push(index);
    }
  });
  const used = new Set();
  const caps = [];
  for (let i = 0; i < boundary.length; i++) {
    if (used.has(i)) continue;
    const loop = [];
    const start = boundary[i].a;
    let current = start;
    let edgeIndex = i;
    let guard = 0;
    while (edgeIndex !== -1 && guard++ <= boundary.length + 1) {
      used.add(edgeIndex);
      const edge = boundary[edgeIndex];
      const next = edge.a === current ? edge.b : edge.a;
      loop.push(next);
      if (next === start) break;
      current = next;
      edgeIndex = (incident.get(current) ?? []).find((index) => !used.has(index)) ?? -1;
    }
    if (loop.length < 3 || loop[loop.length - 1] !== start) continue;
    let perimeter = 0;
    for (let k = 0; k < loop.length; k++) {
      const a = mesh.vertices[loop[k]];
      const b = mesh.vertices[loop[(k + 1) % loop.length]];
      perimeter += Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    if (perimeter <= maxPerimeter) caps.push([...loop].reverse());
  }
  if (!caps.length) return { mesh, caps: 0 };
  const vertices = mesh.vertices.map((point) => ({ ...point }));
  const faces = mesh.faces.map((face) => [...face]);
  for (const cap of caps) faces.push(cap);
  return {
    mesh: createMesh({
      id: mesh.id,
      vertices,
      faces,
      meta: { ...mesh.meta, microCaps: caps.length },
    }),
    caps: caps.length,
  };
}

function floorSolid(curves, radius, floorHeight) {
  const bottom = [];
  for (const curve of curves) {
    for (const point of curve.points ?? []) {
      if (point.z <= floorHeight + 2) bottom.push(point);
    }
  }
  if (!bottom.length) return null;
  const maxRadius = Math.max(...bottom.map((point) => Math.hypot(point.x, point.y)));
  const floorRadius = Math.max(0.5, maxRadius + radius);
  const top = Math.max(floorHeight + radius * 2 + 0.5, radius * 2);
  return cylinderMesh({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: top }, floorRadius, Math.max(10, Math.round(floorRadius)), 'lattice-floor');
}

function rimSolid(curves, height, radius, rimHalfWidth) {
  const top = [];
  let maxZ = -Infinity;
  for (const curve of curves) {
    for (const point of curve.points ?? []) maxZ = Math.max(maxZ, point.z);
  }
  const limit = Number.isFinite(height) ? Math.min(maxZ, height) : maxZ;
  for (const curve of curves) {
    for (const point of curve.points ?? []) {
      if (point.z >= limit - 2) top.push(point);
    }
  }
  if (!top.length) return null;
  const major = Math.max(...top.map((point) => Math.hypot(point.x, point.y)));
  const minor = Math.max(rimHalfWidth, radius * 1.3);
  const centerZ = Number.isFinite(height) ? height - minor : limit;
  return torusSolid(major, minor, centerZ, 96, 10, 'lattice-rim');
}

export function cylinderMesh(a, b, radius, segments, id) {
  const axis = normalize({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }) ?? { x: 0, y: 0, z: 1 };
  const u = perpendicular(axis);
  const v = normalize(cross(axis, u)) ?? perpendicular(axis);
  const vertices = [];
  for (const center of [a, b]) {
    for (let k = 0; k < segments; k++) {
      const angle = (TWO_PI * k) / segments;
      vertices.push({
        x: center.x + radius * (Math.cos(angle) * u.x + Math.sin(angle) * v.x),
        y: center.y + radius * (Math.cos(angle) * u.y + Math.sin(angle) * v.y),
        z: center.z + radius * (Math.cos(angle) * u.z + Math.sin(angle) * v.z),
      });
    }
  }
  const bottomCenter = vertices.length;
  vertices.push({ ...a });
  const topCenter = vertices.length;
  vertices.push({ ...b });
  const faces = [];
  for (let k = 0; k < segments; k++) {
    const next = (k + 1) % segments;
    faces.push([k, next, segments + next, segments + k]);
    faces.push([bottomCenter, next, k]);
    faces.push([topCenter, segments + k, segments + next]);
  }
  return orientMesh(createMesh({ id, vertices, faces, meta: { source: 'lattice-floor' } }));
}

function torusSolid(major, minor, z, majorSegments = 96, minorSegments = 10, id = 'lattice-rim') {
  const vertices = [];
  for (let i = 0; i < majorSegments; i++) {
    const u = (TWO_PI * i) / majorSegments;
    for (let j = 0; j < minorSegments; j++) {
      const v = (TWO_PI * j) / minorSegments;
      const r = major + minor * Math.cos(v);
      vertices.push({ x: r * Math.cos(u), y: r * Math.sin(u), z: z + minor * Math.sin(v) });
    }
  }
  const faces = [];
  for (let i = 0; i < majorSegments; i++) {
    const iNext = (i + 1) % majorSegments;
    for (let j = 0; j < minorSegments; j++) {
      const jNext = (j + 1) % minorSegments;
      const a = i * minorSegments + j;
      const b = iNext * minorSegments + j;
      const c = iNext * minorSegments + jNext;
      const d = i * minorSegments + jNext;
      faces.push([a, b, c, d]);
    }
  }
  return orientMesh(createMesh({ id, vertices, faces, meta: { source: 'lattice-rim' } }));
}

function orientMesh(mesh) {
  const validation = validateMesh(mesh);
  if ((validation.meta?.volume ?? 0) < 0) {
    mesh.faces = mesh.faces.map((face) => [...face].reverse());
    mesh.meta = { ...mesh.meta, flipped: true };
  }
  return mesh;
}

function dedupePoints(points) {
  const out = [];
  for (const point of points) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || !Number.isFinite(point?.z)) continue;
    const previous = out[out.length - 1];
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z) < 1e-6) continue;
    out.push({ x: point.x, y: point.y, z: point.z });
  }
  return out;
}

function perpendicular(axis) {
  const candidate = Math.abs(axis.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  return normalize(cross(axis, candidate)) ?? { x: 1, y: 0, z: 0 };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(a, factor) {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor };
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function normalize(v) {
  const length = Math.hypot(v.x, v.y, v.z);
  if (!Number.isFinite(length) || length < 1e-12) return null;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}
