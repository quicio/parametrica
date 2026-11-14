/**
 * ui/params/StageEditor.ts — shared parameter binding for generators and
 * operators.
 *
 * The module deliberately keeps the existing DOM shape: lil-gui controls,
 * optional Advanced disclosure, one Modulate (time) folder and CodeMirror
 * expression editors. It is the single place that knows how a parameter type
 * becomes UI, so new types are added through ParamRegistry.
 */

import type GUI from 'lil-gui';
import type { ParamSchema } from '../../core/schema.ts';
import { ExpressionField } from '../widgets/ExpressionField.ts';
import { bindParamType, isBindable, isExpression, isModulatable } from './ParamRegistry.ts';
import type { StageLike } from './ParamRegistry.ts';

export type StageParamEntry = [string, ParamSchema[string]];

export interface ExpressionFieldHandle {
  index: number | null;
  key: string;
  field: ExpressionField;
}

export function bindStageParams(
  gui: GUI,
  schema: ParamSchema,
  stage: StageLike,
  rebuild: (key: string) => void,
  { disabled = false }: { disabled?: boolean } = {},
): void {
  for (const [key, entry] of Object.entries(schema)) {
    if (!isBindable(entry)) continue;
    const controller = bindParamType({ gui, key, schema: entry, stage, rebuild });
    if (disabled) controller?.disable?.();
  }
}

export function bindStageMods(
  gui: GUI,
  schema: ParamSchema,
  stage: StageLike,
  rebuild: (key: string) => void,
  { disabled = false }: { disabled?: boolean } = {},
): void {
  const numeric = Object.entries(schema).filter(([, entry]) => isModulatable(entry));
  if (!numeric.length) return;
  const modsFolder = gui.addFolder('Modulate (time)');
  for (const [key, entry] of numeric) {
    if (typeof stage.mods[key] !== 'string') stage.mods[key] = '';
    const ctrl = modsFolder.add(stage.mods, key)
      .name(entry.label ?? key)
      .onFinishChange(() => rebuild(key));
    const doc = entry.doc ?? `Time expression for ${entry.label ?? key}.`;
    ctrl.domElement.title = doc;
    ctrl.domElement.setAttribute('aria-description', doc);
    if (disabled) ctrl.disable();
  }
  modsFolder.close();
}

export function expressionEntries(schema: ParamSchema): StageParamEntry[] {
  return Object.entries(schema).filter(([, entry]) => isExpression(entry));
}

export function createExpressionField({
  key,
  schema,
  get,
  set,
  index = null,
}: {
  key: string;
  schema: ParamSchema[string];
  get: () => string;
  set: (value: string) => void;
  index?: number | null;
  stage?: StageLike;
}): ExpressionFieldHandle {
  const options = {
    label: schema.label ?? key,
    multiline: schema.type === 'source',
    doc: schema.doc ?? '',
    get,
    set,
  };
  const field = new ExpressionField(options);
  return { index, key, field };
}

/** Facade for hosts that prefer a named editor object over free functions. */
export const StageEditor = Object.freeze({
  bindParams: bindStageParams,
  bindMods: bindStageMods,
  expressionEntries,
  createExpressionField,
});
