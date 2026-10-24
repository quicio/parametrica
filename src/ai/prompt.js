/**
 * prompt.js — grounded prompt construction for the optional LLM advisor.
 *
 * Only deterministic observation is sent: descriptors, diffs, sensitivity and
 * a compact document summary. Images are excluded unless explicitly supplied.
 */

export const PROMPT_VERSION = '1';

const SYSTEM_PROMPT = `You are a concise art and mathematics critic for Parametrica.
Use ONLY the supplied parameter paths and measurements. Do not invent params,
operators, layers or values. Return one JSON object matching this schema:
{
  "version": 1,
  "summary": string,
  "changes": [{"path": string, "from": any, "to": any, "reading": string}],
  "suggestions": [{
    "id": string, "path": string, "from": number, "to": number,
    "rationale": string, "expectedEffect": string,
    "confidence": number, "kind": "subtle"|"structural"|"wild"
  }],
  "caveats": string[]
}
Paths use "generator.params.<key>" or "operators[<index>].params.<key>".
Treat suggestions as hypotheses; mention uncertainty in caveats.`;

/**
 * @param {object} input {current, previous, parameterDiff, descriptorDiff,
 *   sensitivity, document, question}
 * @param {{image?: string|null}} options
 */
export function buildAdvisorPrompt(input, { image = null } = {}) {
  const document = input.document ?? null;
  const payload = {
    promptVersion: PROMPT_VERSION,
    current: compactDescriptor(input.current),
    previous: input.previous ? compactDescriptor(input.previous) : null,
    parameterDiff: (input.parameterDiff ?? []).slice(0, 40),
    descriptorDiff: (input.descriptorDiff ?? []).slice(0, 40),
    sensitivity: input.sensitivity?.entries?.slice?.(0, 12) ?? input.sensitivity ?? null,
    document: documentSummary(document),
    question: typeof input.question === 'string' ? input.question.slice(0, 500) : null,
  };
  if (image) payload.image = image;
  return {
    system: SYSTEM_PROMPT,
    user: JSON.stringify(payload, null, 2),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    version: PROMPT_VERSION,
  };
}

function compactDescriptor(descriptor) {
  if (!descriptor) return null;
  return {
    version: descriptor.version,
    documentHash: descriptor.documentHash,
    curveCount: descriptor.curveCount,
    pointCount: descriptor.pointCount,
    closed: descriptor.closed,
    bbox: descriptor.bbox,
    area: descriptor.area,
    perimeter: descriptor.perimeter,
    compactness: descriptor.compactness,
    symmetry: descriptor.symmetry,
    curvature: descriptor.curvature,
    inflections: descriptor.inflections,
    crossings: descriptor.crossings,
    fourier: descriptor.fourier,
    complexity: descriptor.complexity,
    coverage: descriptor.coverage,
    topology: descriptor.topology,
    layers: descriptor.layers?.map((layer) => ({
      layerId: layer.layerId,
      layerName: layer.layerName,
      curveCount: layer.curveCount,
      symmetry: layer.symmetry,
      crossings: layer.crossings,
    })),
  };
}

function documentSummary(document) {
  if (!document) return null;
  return {
    version: document.version,
    name: document.name,
    seed: document.seed,
    activeLayer: document.activeLayer,
    layers: (document.layers ?? []).map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      generator: { id: layer.generator?.id, params: layer.generator?.params },
      operators: (layer.operators ?? []).map((op) => ({ id: op.id, enabled: op.enabled, params: op.params })),
      style: layer.style,
    })),
    view: {
      modes: document.view?.modes,
      artboard: document.view?.artboard,
      strokeWeight: document.view?.strokeWeight,
    },
  };
}
