/**
 * render/reference.js — draw spatial reference geometry with a p5-like or SVG
 * context. Colors are deliberately quiet grays so the artwork stays primary.
 */

const AXIS_STROKE = [190, 190, 190, 160];
const GROUND_STROKE = [135, 135, 135, 60];
const ORIGIN_FILL = [235, 235, 235, 220];
const LABEL_FILL = [185, 185, 185, 220];

export function drawSpatialReference(ctx, reference, { scale = 1, ground = true } = {}) {
  if (!ctx || !reference) return;
  const screen = Number(scale) > 0 ? Number(scale) : 1;
  const px = (value) => value / screen;

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
  for (const axis of reference.axes) {
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
  for (const axis of reference.axes) {
    if (!axis.labelPoint) continue;
    ctx.text(
      axis.label,
      axis.labelPoint.x + px(4),
      axis.labelPoint.y - px(4),
    );
  }

  ctx.pop();
}

function drawRuns(ctx, runs) {
  for (const run of runs ?? []) {
    for (let i = 1; i < run.length; i++) {
      ctx.line(run[i - 1].x, run[i - 1].y, run[i].x, run[i].y);
    }
  }
}
