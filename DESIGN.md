---
name: Parametrica
description: A parametric geometry workbench — Swiss instrument, dark technical surface.
colors:
  carbon-black: "#000000"
  instrument-panel: "#050505"
  raised-panel: "#0d0d0d"
  hairline: "#242424"
  ink: "#f2f2f2"
  ink-dim: "#a3a3a3"
  ink-faint: "#737373"
  swiss-red: "#e30613"
  field: "#0d0d0d"
  layer-row: "#080808"
  dialog-surface: "#080808"
typography:
  display:
    fontFamily: "Helvetica Neue, Helvetica, Inter, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.22em"
  headline:
    fontFamily: "Helvetica Neue, Helvetica, Inter, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.18em"
  body:
    fontFamily: "Helvetica Neue, Helvetica, Inter, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.01em"
  label:
    fontFamily: "SF Mono, IBM Plex Mono, Menlo, monospace"
    fontSize: "8.5px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.04em"
  mono:
    fontFamily: "SF Mono, IBM Plex Mono, Menlo, monospace"
    fontSize: "9px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.1em"
rounded:
  none: "0px"
  dot: "50%"
spacing:
  xs: "4px"
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  mode-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-faint}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "9px 0"
    height: "36px"
  mode-tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "9px 0"
    height: "36px"
  section-header:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    padding: "12px 12px 9px"
  button:
    backgroundColor: "{colors.raised-panel}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "6px 8px"
  button-hover:
    backgroundColor: "{colors.raised-panel}"
    textColor: "{colors.swiss-red}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "6px 8px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
    padding: "6px 7px"
  preset-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "5px"
  layer-row:
    backgroundColor: "{colors.layer-row}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
    padding: "4px 5px"
  dialog:
    backgroundColor: "{colors.dialog-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "16px"
---

# Design System: Parametrica

## Overview

**Creative North Star: "The Swiss Instrument"**

Parametrica looks like a precision instrument that happens to be software: a
black stage, a narrow measurement rail, hairline separators and one red signal.
The canvas is the work; the panel is the console. Nothing is decorated unless it
helps the user read a value, a state or a hierarchy.

The system is flat by default. Depth comes from tonal steps and 1px hairlines,
not from cards floating over the page. Red is rare and operational: it marks the
active mode, the focused edge, an error or a destructive state. Large red
surfaces are a failure of the language.

**Key Characteristics:**

- Carbon-black field with near-black instrument panels.
- Hairline structure; zero-radius rectangles.
- Functional sans for labels, mono for data and expressions.
- One Swiss red signal, used sparingly.
- Dense but legible: 11px functional text and compact 36px mode tabs.
- The canvas remains visually dominant at every breakpoint.

## Colors

Carbon, ink and one signal red. The palette is intentionally narrow so the
geometry and the telemetry carry the color.

### Primary

- **Swiss Signal Red** (#e30613): active mode underline, focus edge, error and
  destructive states, selected accents, the brand cross. It is a signal, never
  a background wash.

### Neutral

- **Carbon Black** (#000000): the stage and the page field.
- **Instrument Panel** (#050505): the control rail.
- **Raised Panel** (#0d0d0d): inputs, buttons, preset hover, tonal separation.
- **Hairline** (#242424): dividers, borders and the structure of the instrument.
- **Ink** (#f2f2f2): primary text and active labels.
- **Ink Dim** (#a3a3a3): secondary labels and section headers.
- **Ink Faint** (#737373): tertiary metadata, hints and placeholders.
- **Layer Row** (#080808): the inset surface of layer rows.
- **Dialog Surface** (#080808): modal/dialog bodies.

### Named Rules

**The Red Signal Rule.** Red occupies less than 10% of any screen. It marks
state and attention; it never fills a panel, a card or a large button face.

**The Hairline Rule.** Structure comes from 1px lines and tonal steps. If a
group can be separated with a hairline, do not add a shadow or a filled card.

## Typography

**Display Font:** Helvetica Neue / Helvetica / Inter / Arial (sans-serif)
**Body Font:** Helvetica Neue / Helvetica / Inter / Arial (sans-serif)
**Label/Mono Font:** SF Mono / IBM Plex Mono / Menlo (monospace)

**Character:** Swiss-functional. The sans face carries identity and readable
labels; the mono face carries values, expressions, telemetry and anything the
user might compare column-to-column.

### Hierarchy

- **Display** (700, 20px, 1): the masthead wordmark only; uppercase with wide
  tracking.
- **Headline** (700, 11px, 1.2): section headers; uppercase with 0.18em
  tracking.
- **Title** (600, 11px, 1.2): mode labels and primary controls.
- **Body** (400, 11px, 1.45): hints, descriptions and dialog copy.
- **Label** (400, 8.5–9px, 0.04–0.1em): data labels, metadata and compact
  control text. Uppercase only when it is a true label, not a sentence.
- **Mono** (400, 9px, 0.1em): numeric readouts, expressions, telemetry and
  layer IDs.

### Named Rules

**The Functional Type Rule.** No serif, display script or decorative face. If
the text is data, it is mono; if it is a control label, it is sans and compact.

**The Legibility Floor Rule.** Functional text stays at 11px or larger where the
layout allows. Do not shrink labels to make room for decoration.

## Layout

The desktop stage is a two-column instrument:

- Canvas: flexible, fills the remaining viewport, black.
- Rail: `clamp(400px, 29vw, 440px)`, scrolls independently, separated by a 1px
  hairline.
- Mode bar: seven equal tabs, 36px high, one line, sticky at the top of the rail.
- Rhythm: 12px horizontal padding; 4/6/12/16/24px vertical steps; compact
  controls rather than generous marketing whitespace.
- Masthead: absolute top-left over the canvas; telemetry: absolute bottom-left.
- Below 900px the stage stacks: canvas 45–50vh, rail 50–55vh, rail scrolls.
- At 200% zoom (`720×450`) there is no page-level horizontal overflow and the
  mode bar stays one line.
- Short viewports hide non-essential masthead/telemetry copy before shrinking
  functional controls.

## Elevation & Depth

**Flat by default.** Surfaces do not float at rest. Hierarchy is expressed with
carbon/panel/raised tonal steps and hairlines. The only real shadows belong to
modal dialogs and the Start With overlay, where the surface must separate from
the entire app.

### Shadow Vocabulary

- **Dialog separation** (`0 18px 60px rgba(0, 0, 0, 0.65)`): confirms a modal
  suspension of the instrument.
- **Start dialog** (`0 24px 80px rgba(0, 0, 0, 0.7)`): the first-run/new-document
  overlay.

### Named Rules

**The Flat-By-Default Rule.** No card shadows, no hover lift, no glass panels.
State changes are borders, color and focus outlines.

**The Overlay Exception.** Shadows are allowed only when a dialog or overlay
must detach from the full-screen instrument.

## Shapes

Rectangles, hairlines and circles for status dots only.

- Corner radius is **0** for panels, buttons, inputs, cards, dialogs, presets and
  layer rows.
- Borders are 1px; active borders may be 2px or a bottom underline.
- Circles/50% radius are reserved for small status dots, seeds and toggle-like
  indicators.
- No clipping paths, blobs, glassmorphism or decorative geometry.
- The red square cross in the masthead is the only brand mark with a filled
  surface.

## Components

### Mode Tabs

- **Shape:** flat rectangle, 36px high, no radius.
- **Default:** transparent, faint uppercase label, no border.
- **Active:** ink label with a 2px Swiss red bottom border.
- **Focus:** 1px ink outline with 2px offset; never confused with the red active
  state.
- **Behavior:** roving tabindex; Arrow/Home/End move focus and selection.

### Section Headers

- **Shape:** full-width button, 1px bottom separator.
- **Type:** 11px uppercase, 700 weight, 0.18em tracking, ink-dim.
- **State:** caret rotates 90 degrees when open; hover promotes to ink.
- **Density:** 12px horizontal padding; 12px top, 9px bottom.

### Buttons

- **Shape:** rectangular, 0 radius, 1px hairline border.
- **Default:** raised-panel background, ink text, uppercase 9px label.
- **Hover:** border and text become Swiss red.
- **Focus:** 1px ink outline, 2px offset, plus a faint 3px halo.
- **Accent:** use red border/text for destructive or primary confirmation, not a
  full red fill unless it is a deliberate high-emphasis action.

### Inputs and Fields

- **Shape:** rectangular, 0 radius, 1px hairline border.
- **Surface:** `#0d0d0d` field on the instrument panel.
- **Type:** mono 9–10px; text inputs align values for comparison.
- **Focus:** border shifts to Swiss red or ink depending on context; no glow.
- **Placeholder:** ink-faint; never used as the only label.

### Preset Rows

- **Shape:** full-width row, 2px left border reserved for active state.
- **Default:** transparent, ink-dim text; 44px thumbnail with 1px border.
- **Hover:** raised-panel background, ink text.
- **Active:** raised-panel background plus a Swiss red left border.
- **Metadata:** 8px mono description, clamped to two lines; 7px badge.

### Layer Rows

- **Shape:** inset rectangle, 1px hairline, 0 radius.
- **Surface:** layer-row `#080808`.
- **Active:** Swiss red border; hidden rows drop to 45% opacity; locked rows use
  italic/faint names.
- **Actions:** compact 18px icon buttons; keyboard selectable; accessible names.

### Dialogs and Start With

- **Shape:** rectangular, 0 radius, 1px hairline, deep shadow.
- **Surface:** `#080808`.
- **Type:** mono titles, sans/mono body, 16px padding.
- **Focus:** modal focus trap; Escape cancels; Enter confirms.
- **Start With:** three-column card grid on desktop, stacked on narrow screens;
  cards are flat rectangles with a hairline and a raised-panel hover.

### Signature Chrome

- **Masthead:** red square, uppercase wordmark, tracked subtitle and doctrine.
- **Telemetry:** bottom-left mono readout; it is part of the instrument, not a
  badge.
- **Parametric overlay / UV inset / surface inspector:** thin technical
  annotations that never compete with the canvas.

## Do's and Don'ts

### Do:

- **Do** keep the canvas black and visually dominant.
- **Do** use Swiss red for state, focus, error and one clear active accent.
- **Do** separate groups with hairlines and tonal steps.
- **Do** use mono for values, expressions, telemetry and IDs.
- **Do** preserve keyboard focus, reduced motion and 200% zoom behavior.
- **Do** keep controls compact and functional; density is part of the identity.

### Don't:

- **Don't** introduce a second accent color or a gradient background.
- **Don't** round cards, buttons or panels; radius is 0.
- **Don't** add card shadows, hover lift or glassmorphism.
- **Don't** fill large areas with Swiss red.
- **Don't** use decorative serif or display faces.
- **Don't** hide the canvas behind chrome or oversized empty states.
- **Don't** lower functional text below 11px to create “breathing room”.
- **Don't** invent testimonials, metrics or fabrication claims in UI copy.
