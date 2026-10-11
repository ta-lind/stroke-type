"""Bundle the included SVG font sources without changing their glyph paths.

Run with Python 3 (standard library only), then node build.cjs.
"""
from pathlib import Path
import html
import json
import math
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
NS = {'s': 'http://www.w3.org/2000/svg'}
TOKEN = re.compile(r'[MLCQZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?')
ARITY = {'M': 2, 'L': 2, 'C': 6, 'Q': 4, 'Z': 0}
PREFERRED = ['EMSTech', 'EMSCasualHand', 'EMSNeato']
SINGLE_HERSHEY = {'HersheySans1', 'HersheyScript1', 'TwinSans'}


def bounds(path):
    if not path:
        return [0, 0, 0, 0]
    if TOKEN.sub('', path).strip(' \t\r\n,'):
        raise ValueError('Unsupported glyph path: ' + path[:80])
    tokens = TOKEN.findall(path)
    points = []
    i = 0
    command = None
    while i < len(tokens):
        if tokens[i] in ARITY:
            command = tokens[i]
            i += 1
        if command is None:
            raise ValueError('Path missing command')
        if command == 'Z':
            command = None
            continue
        count = ARITY[command]
        values = [float(v) for v in tokens[i:i + count]]
        if len(values) != count or not all(math.isfinite(v) for v in values):
            raise ValueError('Invalid coordinates')
        points.extend(zip(values[::2], values[1::2]))
        i += count
        if command == 'M':
            command = 'L'
    # Control hull bounds safely contain curves, matching the original renderer.
    return [min(p[0] for p in points), min(p[1] for p in points),
            max(p[0] for p in points), max(p[1] for p in points)]


fonts = {}
catalog = []
paths = sorted((ROOT / 'fonts').glob('*.svg'), key=lambda p: (
    PREFERRED.index(p.stem) if p.stem in PREFERRED else len(PREFERRED), p.stem))
for path in paths:
    root = ET.parse(path).getroot()
    font = root.find('.//s:font', NS)
    face = font.find('s:font-face', NS)
    identifier = font.get('id')
    if identifier in fonts:
        raise ValueError('Duplicate font: ' + identifier)
    metadata = root.find('s:metadata', NS)
    credits = ''.join(metadata.itertext()).strip()
    glyphs = {}
    for glyph in font.findall('s:glyph', NS):
        char = glyph.get('unicode', '')
        if len(char) != 1 or char in glyphs:
            raise ValueError('Unsupported or duplicate character in ' + identifier)
        d = glyph.get('d', '')
        advance = float(glyph.get('horiz-adv-x', font.get('horiz-adv-x')))
        if not math.isfinite(advance) or advance < 0:
            raise ValueError('Invalid advance in ' + identifier)
        glyphs[char] = {'advance': advance, 'd': d, 'bounds': bounds(d)}
    h = glyphs['H']['bounds']
    em = float(face.get('units-per-em'))
    cap_height = h[3] - h[1]
    if not (em > 0 and cap_height > 0 and ' ' in glyphs):
        raise ValueError('Incomplete font metrics in ' + identifier)
    family = face.get('font-family')
    hershey = identifier.startswith('Hershey')
    license_name = 'Hershey distribution license' if hershey else 'SIL Open Font License 1.1'
    fonts[identifier] = {'id': identifier, 'name': family, 'em': em,
                         'capHeight': cap_height, 'capTop': h[3], 'glyphs': glyphs,
                         'license': license_name, 'credits': credits}
    multi = hershey and identifier not in SINGLE_HERSHEY
    supported = ''.join(c for c in 'ÕÄÖÜŠŽõäöüšž' if c in glyphs)
    missing = ''.join(c for c in 'ÕÄÖÜŠŽõäöüšž' if c not in glyphs)
    note = 'Supports Õ Ä Ö Ü Š Ž and their lowercase letters.' if not missing else (
        'No Estonian accented letters; use another font for Estonian text.' if not supported else
        'Supports Õ Ä Ö Ü and lowercase; missing Š Ž š ž.')
    if multi:
        note += ' Multiple pen strokes create the heavier style; plotting takes longer.'
    catalog.append({'id': identifier, 'name': family, 'glyphCount': len(glyphs),
                    'multipleStrokes': multi, 'missingEstonian': missing, 'note': note})

encoded = json.dumps(fonts, ensure_ascii=False, separators=(',', ':'))
(ROOT / 'fonts.json').write_text(encoded + '\n')
(ROOT / 'fonts-data.ts').write_text('const BUILTIN_FONTS: Record<string, StrokeFont> = ' + encoded + ';\n')
(ROOT / 'fonts-catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
options = []
for entry in catalog:
    suffix = ' · multiple strokes' if entry['multipleStrokes'] else ''
    if entry['missingEstonian']:
        suffix += ' · limited accents'
    options.append('<option value="' + html.escape(entry['id'], quote=True) +
                   '" data-note="' + html.escape(entry['note'], quote=True) +
                   '" data-credits="' + html.escape(fonts[entry['id']]['credits'], quote=True).replace('\n', '&#10;') +
                   '" data-license="' + html.escape(fonts[entry['id']]['license'], quote=True) + '">' +
                   html.escape(entry['name'] + suffix) + '</option>')
ui = (ROOT / 'ui.html').read_text()
ui, count = re.subn(r'(<fig-dropdown id="font"[^>]*>).*?(</fig-dropdown>)',
                    lambda m: m[1] + ''.join(options) + m[2], ui, count=1, flags=re.S)
if count != 1:
    raise ValueError('Font chooser not found')
ofl = (ROOT / 'fonts' / 'OFL.txt').read_text()
# Keep the upstream file byte-for-byte; show its actual license text without
# the upstream template's placeholder copyright lines in the panel.
ofl = ofl[ofl.index('SIL OPEN FONT LICENSE Version 1.1'):]
ui, count = re.subn(r'(<!-- FONT_LICENSES_START -->).*?(<!-- FONT_LICENSES_END -->)',
                    lambda m: m[1] + '<pre class="credits-text">' + html.escape('\n'.join(line.rstrip() for line in ofl.splitlines())) + '</pre>' + m[2],
                    ui, count=1, flags=re.S)
if count != 1:
    raise ValueError('Font license panel not found')
(ROOT / 'ui.html').write_text(ui)
credits = [
    '# Stroke Type — font credits and licenses',
    '',
    'Stroke Type is maintained by [ta-lind](https://github.com/ta-lind). '
    'The bundled fonts are third-party work; their designers and converters are credited below.',
    '',
    'The 41 original SVG font files come from [Windell H. Oskay’s SVG Fonts collection]'
    '(https://gitlab.com/oskay/svg-fonts), revision '
    '`8c71f2d9e1a5292047bb88e5595a766241b82cc6`. '
    'The SVG files retain their original metadata and glyph paths. '
    'Generated font data retains that metadata. The plugin displays the selected font’s '
    'complete attribution and includes the SIL OFL text; Hershey attribution and '
    'restrictions appear with each Hershey font.',
    '',
    'EMS fonts and Twin Sans: [SIL Open Font License 1.1](fonts/OFL.txt). '
    'Classic Hershey fonts: [Hershey distribution license and acknowledgements]'
    '(fonts/HERSHEY-LICENSE.txt). These licenses apply to the font software, '
    'including its generated representations. The MIT license for the plugin code '
    'does not replace the font licenses.',
    '',
    'See also the [upstream README](fonts/SOURCE-README.md) and [source revision](fonts/SOURCE.txt).',
    '',
]
for entry in catalog:
    font = fonts[entry['id']]
    credits.extend(['## ' + entry['name'], '',
                    '[Original SVG and metadata](fonts/' + entry['id'] + '.svg)', '',
                    'License: ' + font['license'] + '.', '',
                    '```text', '\n'.join(line.rstrip() for line in font['credits'].splitlines()), '```', ''])
(ROOT / 'CREDITS.md').write_text('\n'.join(credits))
hershey_root = ET.parse(ROOT / 'fonts' / 'HersheySans1.svg').getroot()
(ROOT / 'fonts' / 'HERSHEY-LICENSE.txt').write_text(
    ''.join(hershey_root.find('s:metadata', NS).itertext()).strip() + '\n')
print(f'Bundled {len(fonts)} fonts and {sum(len(f["glyphs"]) for f in fonts.values())} glyphs')
