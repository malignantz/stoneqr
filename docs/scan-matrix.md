# Scan matrix

Real-phone results for every export format at every test-sheet size. Repeat whenever a renderer changes (plan §12). Print `Print test sheet` from the generator at 100% scale on plain paper; a laser print is the baseline, an inkjet print is the second row.

Legend: ✅ scanned first try · ⚠️ scanned after moving/lighting · ❌ did not scan · – not tested

## Plain black-on-white (ECC M, version 2 URL)

| Size | iPhone Camera (iOS __) | Android Camera (Pixel __) | Google Lens | Notes |
|---|---|---|---|---|
| 15 mm | – | – | – | modules 0.45 mm |
| 20 mm | – | – | – | |
| 30 mm | – | – | – | |
| 50 mm | – | – | – | |

## Styled (rounded dots, corner styles)

| Size | iPhone Camera | Android Camera | Google Lens | Notes |
|---|---|---|---|---|
| 20 mm | – | – | – | |
| 30 mm | – | – | – | |
| 50 mm | – | – | – | |

## Logo at 20% area, ECC H, knockout on

| Size | iPhone Camera | Android Camera | Google Lens | Notes |
|---|---|---|---|---|
| 30 mm | – | – | – | |
| 50 mm | – | – | – | |

## Inverted (white on black)

| Size | iPhone Camera | Android Camera | Google Lens | Notes |
|---|---|---|---|---|
| 30 mm | – | – | – | plan expects older Android to fail |

## Halftone (dotScale 0.4, version ≥ 7)

| Size | iPhone Camera | Android Camera | Google Lens | Notes |
|---|---|---|---|---|
| 30 mm | – | – | – | |
| 50 mm | – | – | – | |

## Content types (30 mm, plain)

| Type | iPhone Camera | Android Camera | Google Lens | Notes |
|---|---|---|---|---|
| WiFi (WPA, hidden off) | – | – | – | expect "Join network" prompt |
| vCard 3.0 | – | – | – | expect "Add contact" |
| MeCard | – | – | – | |
| mailto with subject | – | – | – | |
| sms: with ?body= | – | – | – | |
| SMSTO: | – | – | – | |
| tel: | – | – | – | |
| geo: | – | – | – | |
| VEVENT | – | – | – | record which phones offer "Add to calendar" |

## File formats opened in

| Format | Illustrator | Affinity | Inkscape | Preview.app | Print shop RIP | Notes |
|---|---|---|---|---|---|---|
| SVG (mm) | – | – | – | – | – | check the artboard reads 30 × 30 mm |
| PDF (CMYK) | – | – | – | – | – | check ink is 100% K only |
| EPS | – | – | – | – | – | |
| PNG 300 dpi | – | – | – | – | – | check the DPI metadata reads 300 |
| Avery 5160 labels | – | – | – | – | – | print the calibration sheet first |
