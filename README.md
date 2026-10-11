# Stroke Type

[Public repository](https://github.com/ta-lind/stroke-type) · [Download the latest plugin](https://github.com/ta-lind/stroke-type/releases/latest) · [Font credits and licenses](CREDITS.md)

A Figma Design development plugin that converts selected text into single-stroke handwriting vectors. It keeps the editable source layer and can regenerate the lettering after changes. All 41 fonts from the SVG Fonts collection are bundled: no font installation or internet connection is needed to run it.

## Install in Figma desktop

1. Unzip `Stroke-Type-Figma-Plugin.zip` and keep the folder in a permanent location.
2. Open a Figma Design file you can edit in the desktop application.
3. Choose **Plugins → Development → Import plugin from manifest…** and select this folder's `manifest.json`.
4. Run **Plugins → Development → Stroke Type**.

This is a Figma desktop development plugin. If Figma asks for a registered plugin ID, create a new development plugin and copy its generated ID into `manifest.json`; keep the remaining fields and files.

## Update to 0.2.1

Close Stroke Type, then replace **both `code.js` and `ui.html`** in the folder you originally imported into Figma with the files from the new ZIP. Reopen the plugin. Keep your existing `manifest.json`, including any ID you registered yourself. No reimport is required when you update the same folder.

Version 0.2.1 links this public repository from the plugin and adds an offline **Font credits and licenses** section. Select a font to read its original attribution. The complete SIL OFL text is available in the panel; selecting a classic Hershey font displays its required acknowledgements and distribution conditions. All 41 fonts and the Unicode line-break fix are included.

## Use

1. Select a text layer, multiple text layers, or a free-positioned frame containing text.
2. Choose one of the **41 stroke fonts**. EMS Tech remains the default; uppercase is enabled by default. A note below the chooser identifies any accent limitations or multiple-stroke styles.
3. Keep **Use selected text size** enabled, or disable it to specify capital height in millimeters.
4. Set pen width and optional additional letter spacing, then click **Convert / update**.
5. The plugin creates a stroke-vector frame at the original position and retains the original text, hidden by default.
6. Select the generated frame and click **Edit original**. Edit the source text in Figma, then use **Convert / update** again. The previous generated version is replaced.

When using source size, size is taken from the text layer and converted using the stroke font's em metrics. Explicit capital height is calibrated to the font's uppercase H. Fonts retain their natural letter-to-letter variation.

## Plotter SVG export

Use **Download stroke SVG** in the plugin. It reads the current canvas vector paths, including your repositioning, and writes centerline paths with `fill="none"`.

- Select generated lettering to export its bounds.
- Select a containing poster frame to retain the frame's origin and page dimensions.
- Choose **A3 portrait** or **A3 landscape** to write exactly 297 × 420 mm or 420 × 297 mm.
- The SVG includes generated lettering only, not other poster artwork or retained text. Do not use Figma's ordinary SVG export for the final pen paths, since it can expand strokes into outlines.
- Millimeter conversion uses **96 Figma units per inch**: an A3 portrait frame is **1122.519685 × 1587.401575** Figma units. Imported frames with another scale need correction before export.
- Export stops if letter paths fall outside the chosen page. A physical plot should still be checked at 100% scale with the intended pen and paper.

## Supported and unsupported layouts

Supported: left, center, and right alignment; explicit newlines (including Unicode line and paragraph separators); word wrapping to the original text box width; rotated layers; ordinary free-positioned frames; original mixed fonts when font size is uniform; mixed sizes when explicit capital height is selected.

Not yet supported: exact Figma typography/kerning reproduction, rich text sizing within one generated layer, justified alignment, automatic sizing within auto-layout flows, text inside component instances, or importing additional SVG fonts through the UI. Make text absolute within auto layout, move it into a free-positioned frame, or detach the instance before conversion. The plugin does not register SVG fonts in Figma's font picker.

Existing styling is retained on the source layer. Generated text uses the chosen font, uniform letter size, and a dark stroke. Wrapping can change, and output may become taller; the plugin reports this so the poster can be checked.

## Fonts and license

The complete collection contains **29 EMS fonts and 12 Hershey / Twin Sans fonts**. Full per-font attribution is in [CREDITS.md](CREDITS.md) and in the plugin’s **Font credits and licenses** section. Original SVG sources and embedded attribution are included in `fonts/`, along with `OFL.txt`, `HERSHEY-LICENSE.txt`, and the upstream README. EMS and Twin Sans use SIL OFL 1.1; classic Hershey fonts use their included distribution license. Source: https://gitlab.com/oskay/svg-fonts at revision `8c71f2d9e1a5292047bb88e5595a766241b82cc6`.

All exported lettering uses unfilled pen paths. Some heavier Hershey styles contain several parallel paths or closed strokes and take more passes to plot. Their paths are preserved as supplied. Missing accented glyphs are reported rather than substituted or stripped.

| Font | Estonian letters | Pen paths |
| --- | --- | --- |
| EMS Tech | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Casual Hand | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Neato | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Allure | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Bird | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Bird Swash Caps | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Brush | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Capitol | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Decorous Script | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Delight | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Delight Swash Caps | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Elfin | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Felix | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Herculean | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Invite | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS League | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Little Princess | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Misty Night | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Nixish | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Nixish Italic | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Osmotron | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Pancakes | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Pepita | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Qwandry | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Readability | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Readability Italic | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS Society | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| EMS SpaceRocks | No Estonian accents | Stroke paths |
| EMS Swiss | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| Hershey Gothic English | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Hershey Gothic German | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Hershey Gothic Italian | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Hershey Sans 1-stroke | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| Hershey Sans medium | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Hershey Script 1-stroke | Õ Ä Ö Ü Š Ž + lowercase | Stroke paths |
| Hershey Script medium | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Hershey Serif bold | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Hershey Serif bold italic | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Hershey Serif medium | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Hershey Serif medium italic | Õ Ä Ö Ü Š Ž + lowercase | Multiple strokes |
| Twin Sans | Õ Ä Ö Ü + lowercase; no Š Ž š ž | Stroke paths |

## Validation

The plugin passed strict TypeScript checking, 225 renderer and controller tests (with a Figma API mock), and headless-browser UI tests. Tests render every drawable glyph, convert and regenerate each font, and cover supported accent characters, Estonian fixtures with Unicode line breaks across every compatible font, wrapping, path transforms, source retention, regeneration, batch preflight, mixed sizing, hidden-layer selection, control inputs, and exact A3 SVG dimensions. Automated controller tests use a mock rather than a live Figma editor.

## Source and rebuild

`code.ts` is the complete deployable entrypoint. It is assembled from `engine.ts`, `fonts-data.ts`, and `controller.ts`. `code.js` is precompiled and runs without a build step.

To regenerate the embedded font data and chooser from the included SVG sources, run `python3 generate-fonts.py` (Python standard library only), then `node build.cjs`. The original three font metrics and glyph geometry are unchanged.

For development, install Node.js and Python 3, run `npm ci`, then use `npm run fonts`, `npm run build`, `npm run check`, and `npm test`. Use `npm run test:ui` after installing a Playwright browser or set `STROKE_TYPE_CHROME` to your installed Chrome executable.

## Code license

Stroke Type plugin code is [MIT licensed](LICENSE). Font sources and generated representations retain the separate licenses documented in [CREDITS.md](CREDITS.md).
