/** Draw spatial reference geometry with a p5-like or SVG context. */

const AXIS_STROKE = [190, 190, 190, 160];
const GROUND_STROKE = [135, 135, 135, 60];
const ORIGIN_FILL = [235, 235, 235, 220];
const LABEL_FILL = [185, 185, 185, 220];

interface Vec2 { x: number; y: number; [key: string]: unknown }
interface AxisLike {
  runs?: Vec2[][];
  label?: string;
  labelPoint?: Vec2 | null;
  [key: string]: unknown;
}
interface ReferenceLike {
  ground?: AxisLike[];
  axes?: AxisLike[];
  origin?: Vec2 | null;
  [key: string]: unknown;
}
export interface ReferenceContext {
  push(): unknown;
  pop(): unknown;
  noFill(): unknown;
  noStroke(): unknown;
  stroke(...args: unknown[]): unknown;
  strokeWeight(value: number): unknown;
  fill(...args: unknown[]): unknown;
  circle(x: number, y: number, diameter: number): unknown;
  textSize(value: number): unknown;
  text(value: unknown, x: number, y: number): unknown;
  line(x1: number, y1: number, x2: number, y2: number): unknown;
}
export interface ReferenceOptions {
  scale?: number;
  ground?: boolean;
}

export function drawSpatialReference(
  ctx: ReferenceContext | null | undefined,
  reference: ReferenceLike | null | undefined,
  { scale = 1, ground = true }: ReferenceOptions = {},
): void {
  if (!ctx || !reference) return;
  const screen = Number(scale) > 0 ? Number(scale) : 1;
  const px = (value: number): number => value / screen;

  ctx.push();
  ctx.noFill();

  if (ground && reference.ground?.length) {
    ctx.stroke(...GROUND_STROKE);
    ctx.strokeWeight(px(0.55));
    for (const line of reference.ground) {
      drawRuns(ctx, line.runs);
    }
  }

  ctx.stroke(...AXIS_STROKE);
  ctx.strokeWeight(px(1));
  for (const axis of reference.axes ?? []) {
    drawRuns(ctx, axis.runs);
  }

  if (reference.origin) {
    ctx.noStroke();
    ctx.fill(...ORIGIN_FILL);
    ctx.circle(reference.origin.x, reference.origin.y, px(4));
  }

  ctx.noStroke();
  ctx.fill(...LABEL_FILL);
  ctx.textSize(px(10));
  for (const axis of reference.axes ?? []) {
    if (!axis.labelPoint) continue;
    ctx.text(
      axis.label,
      axis.labelPoint.x + px(4),
      axis.labelPoint.y - px(4),
    );
  }

  ctx.pop();
}

function drawRuns(ctx: ReferenceContext, runs: Vec2[][] | undefined): void {
  for (const run of runs ?? []) {
    for (let i = 1; i < run.length; i++) {
      const a = run[i - 1];
      const b = run[i];
      if (!a || !b) continue;
      ctx.line(a.x, a.y, b.x, b.y);
    }
  }
}
