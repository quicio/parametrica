/** Grounded prompt construction for the optional LLM advisor. */

type Rec = Record<string, unknown>;

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

export interface AdvisorPromptInput {
  current?: unknown;
  previous?: unknown;
  parameterDiff?: unknown[];
  descriptorDiff?: unknown[];
  sensitivity?: { entries?: unknown[] } | unknown;
  document?: unknown;
  question?: unknown;
  [key: string]: unknown;
}
export interface AdvisorMessage {
  role: 'system' | 'user';
  content: string;
}
export interface AdvisorPrompt {
  system: string;
  user: string;
  messages: AdvisorMessage[];
  version: string;
}

export function buildAdvisorPrompt(input: AdvisorPromptInput, { image = null }: { image?: string | null } = {}): AdvisorPrompt {
  const document = input.document ?? null;
  const sensitivity = input.sensitivity as { entries?: unknown[] } | null | undefined;
  const payload: Rec = {
    promptVersion: PROMPT_VERSION,
    current: compactDescriptor(input.current),
    previous: input.previous ? compactDescriptor(input.previous) : null,
    parameterDiff: (input.parameterDiff ?? []).slice(0, 40),
    descriptorDiff: (input.descriptorDiff ?? []).slice(0, 40),
    sensitivity: sensitivity?.entries?.slice?.(0, 12) ?? input.sensitivity ?? null,
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

function compactDescriptor(descriptor: unknown): Rec | null {
  if (!descriptor || typeof descriptor !== 'object') return null;
  const source = descriptor as Rec;
  const layers = Array.isArray(source.layers) ? source.layers as Rec[] : null;
  return {
    version: source.version,
    documentHash: source.documentHash,
    curveCount: source.curveCount,
    pointCount: source.pointCount,
    closed: source.closed,
    bbox: source.bbox,
    area: source.area,
    perimeter: source.perimeter,
    compactness: source.compactness,
    symmetry: source.symmetry,
    curvature: source.curvature,
    inflections: source.inflections,
    crossings: source.crossings,
    fourier: source.fourier,
    complexity: source.complexity,
    coverage: source.coverage,
    topology: source.topology,
    layers: layers?.map((layer) => ({
      layerId: layer.layerId,
      layerName: layer.layerName,
      curveCount: layer.curveCount,
      symmetry: layer.symmetry,
      crossings: layer.crossings,
    })),
  };
}

function documentSummary(document: unknown): Rec | null {
  if (!document || typeof document !== 'object') return null;
  const source = document as Rec;
  const layers = Array.isArray(source.layers) ? source.layers as Rec[] : [];
  const view = (source.view && typeof source.view === 'object' ? source.view : {}) as Rec;
  return {
    version: source.version,
    name: source.name,
    seed: source.seed,
    activeLayer: source.activeLayer,
    layers: layers.map((layer) => {
      const generator = (layer.generator && typeof layer.generator === 'object' ? layer.generator : {}) as Rec;
      const operators = Array.isArray(layer.operators) ? layer.operators as Rec[] : [];
      return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        generator: { id: generator.id, params: generator.params },
        operators: operators.map((op) => ({ id: op.id, enabled: op.enabled, params: op.params })),
        style: layer.style,
      };
    }),
    view: {
      modes: view.modes,
      artboard: view.artboard,
      strokeWeight: view.strokeWeight,
    },
  };
}
