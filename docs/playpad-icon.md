# Playpad icon

## H / project sources

- [`favicon.svg`](../favicon.svg) is a near-black rounded tile with a graphite
  circular ring, an amber pulse trace, and a pale-lime endpoint.
- [`styles.css`](../styles.css) uses near-black blue-gray surfaces, warm amber
  (`#ffb84d`), acid lime (`#e7ff70`), and a circular reactor with subtle glow.
- [`specs/game.md`](../specs/game.md) defines the live game surface but does not
  prescribe an illustration style.
- No `specs/design/prompts` directory or formal art-direction record was present
  in the current project files.

## AI / inference

The icon carries the existing ring-and-pulse motif into a square raster asset,
with restrained reactor glow and a dark matte tile. Those rendering details are
a narrow inference from the current favicon and UI, not additional recorded art
direction. The supplied favicon was rendered temporarily as a style reference;
the source SVG remains unchanged.

## OPEN

No formal icon-specific art direction is recorded. The image follows the
inference above; no new project-wide visual rules are implied.

## Asset and provenance

- Asset: [`icon.png`](../icon.png), 1254 × 1254 pixels, opaque RGB PNG.
- Generated once with the built-in `image_gen` tool in the assigned GPT-6
  Luna/xhigh session, using the existing favicon as a style reference.
- The saved project PNG is a byte-for-byte copy of the generated image.
- Small-size visual check: the ring, pulse trace, and endpoint remain distinct
  at the intended 96–120 px display size.

## Exact image prompt

```text
Use case: logo-brand
Asset type: one square project icon for the Hold the Line browser game
Input images: Image 1: style reference only; follow its dark tile, graphite circular ring, amber pulse line, and pale-lime signal dot; do not reproduce it mechanically
Primary request: create one crisp, compact reactor warning icon centered on a square rounded-corner tile. Keep the recognizable circle-plus-electrical-pulse motif and make the pulse and ring read clearly at 96–120 px.
Scene/backdrop: opaque near-black blue-charcoal (#0b0d12) square tile filling the canvas, with a subtle radial reactor glow and only a whisper of fine grain
Subject: a bold muted-graphite circular reactor ring; across its center, a thick rounded amber-orange heartbeat zigzag with one small pale-lime node at its endpoint; a restrained warm core glow behind the trace
Style/medium: minimal graphic illustration, clean vector-like shapes with very subtle soft bloom, matching the restrained dark game UI; no photorealism and no perspective
Composition/framing: frontal, square 1024 × 1024 icon, single centered symbol, balanced padding, strong silhouette and high contrast at small size
Color palette: near-black charcoal, graphite gray, warm amber-orange, one pale-lime accent; keep colors restrained
Materials/textures: matte flat surfaces, crisp edges, gentle localized glow only
Text (verbatim): none
Constraints: one image only; no letters, initials, numbers, slogans, tiny labels, UI mockup, border outside the rounded square, extra symbols, brand marks, or watermark
```
