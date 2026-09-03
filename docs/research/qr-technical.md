# Research: Advanced QR generator technical notes, 2026-09-02

Compiled by a research agent. [unverified] items should be spot-checked before they become user-facing claims.

## 1. JS/TS QR library comparison

| Library | Latest | Gzip | Worker-safe | SVG | Styling | Logo | ECC/version/mask | Micro QR | Notes |
|---|---|---|---|---|---|---|---|---|---|
| uqr (unjs) | 0.1.3 / 2026-04 | 4.4 KB | Yes | renderSVG | No | No | ecc, min/maxVersion, maskPattern, border, invert | No | Port of Nayuki; encode() returns raw matrix. https://github.com/unjs/uqr |
| @paulmillr/qr | 0.3.0 / 2026-05 | 6.7 KB | Yes (DOM utils separate) | Yes (+GIF, ASCII) | No | No | ecc, version 1-40, mask 0-7, mode, border, scale | No | Zero deps, audited; also DECODES (use for verify-scannability). https://github.com/paulmillr/qr |
| lean-qr | 2.7.3 / 2026-08 | 3.7 KB | Yes | toSvgSource, toPngBuffer, toCanvas | No | No | min/max correction, min/max version, mask | No | Smallest. https://github.com/davidje13/lean-qr |
| @juit/qrcode | 1.0.109 / 2026-08 | n/a | Yes, targets Workers explicitly | SVG, PNG, PDF as Uint8Array | No | No | ecLevel, scale, margin | No | Only pure-JS lib producing PNG and PDF bytes in a Worker. https://github.com/juitnow/juit-qrcode |
| qrcode (node-qrcode) | 1.5.4 / 2025-11 | 8.8 KB | Partial (SVG string ok; PNG needs canvas) | Yes | No | No | version, errorCorrectionLevel, maskPattern | No | Most used. |
| qrcode-generator (kazuhikoarase) | 2.0.4 / 2025-08 | 7.2 KB | Yes | Yes | No | No | typeNumber, ECC, mode | No | Used inside qr-code-styling. |
| Nayuki qrcodegen (TS) | not on npm | tiny | Yes | sample | No | No | encodeSegments(segs, ecl, minVer, maxVer, mask, boostEcl) | No | MIT; vendor the .ts. https://www.nayuki.io/page/qr-code-generator-library |
| qr-code-styling (kozakdenys) | 1.9.2 / 2025-04 | 13.8 KB | Browser-first; not Worker-safe | Yes | dots rounded/dots/classy/square/extra-rounded; corner styles; gradients; circle shape | Yes (imageSize <= 0.5, hideBackgroundDots) | typeNumber, mode, ECC | No | 690k weekly downloads, ~17 months no release. |
| @liquid-js/qr-code-styling | 5.5.0 / 2026-05 | 16.8 KB | Browser; Node needs xmldom + sharp | Yes | same + plugin system, BorderPlugin (frame + text) | Yes | same | No | Actively maintained fork; best styled option for browser. https://github.com/liquid-js/qr-code-styling |
| @qr-platform/qr-code.js | 0.20.14 | 3 MB | Node only | Yes | full | Yes | Yes | No | Commercial license for commercial use: avoid. |
| bwip-js | 4.11.4 / 2026-08 | large, tree-shakeable | Yes (toSVG anywhere) | Yes | No | No | via BWIPP | Yes: microqrcode, rectangularmicroqrcode | Only mainstream JS route to Micro QR/rMQR. |
| @nuintun/qrcode | 5.0.3 / 2026-02 | - | Canvas output; matrix pure | DataURL | No | No | version, level, mask, Kanji/Hanzi, ECI, FNC1, structured append | No | Exotic modes; also decodes. |
| easyqrcodejs | 4.6.2 | 1.8 MB | Browser | Yes | dot styles, background image, title | Yes | Yes | No | Heavy; background is overlay, not halftone. |
| awesome-qr | 2.1.5-rc / 2022 | - | needs canvas | No | background + dotScale | Yes | - | No | Stale; approximates halftone. |
| qrbtf | 2022, GPL-3 | - | React | Yes | artistic styles | - | - | No | GPL, stale. |

Halftone/artistic in JS: no maintained npm lib. Implement on the raw matrix (~150 lines) using any Worker-safe encoder exposing the matrix.

Recommendation: uqr or @paulmillr/qr as the core encoder (browser + Worker); @liquid-js/qr-code-styling browser-only for styled shapes; bwip-js (tree-shaken) only if Micro QR/rMQR is offered.

## 2. Python comparison and what "artistic" means

- segno + qrcode-artistic: to_artistic(background, target, scale); static images and animated GIF/WebP. Algorithm: finder, separator, alignment and timing patterns are kept opaque; for other cells only the centre 1/3 x 1/3 sub-square keeps the QR colour, rest shows background. https://segno.readthedocs.io/en/latest/artistic-qrcodes.html , https://github.com/heuer/qrcode-artistic
- amazing-qr (amzqr): version, level, picture, colorized, contrast, brightness. Background centre-cropped to data area; reserved-region mask protects finders, timing row/col 6, alignment centres; "sampling holes" at every module centre; alpha-masked paste. https://github.com/x-hw/amazing-qr
- python-qrcode StyledPilImage: module drawers + color masks + embedded centre logo. Styling, not halftone.

Reimplementing in JS/canvas:
1. Encode with ECC H (30%); optionally force a higher version for more modules.
2. Draw background image scaled/cropped to the symbol (excluding quiet zone).
3. Per module: function patterns (finder 7x7 + separator at 3 corners, timing row/col 6, alignment patterns, format/version info) painted solid. Otherwise paint only a centre dot (~1/3 module width; dotScale 0.33-0.5) in dark or light. Optionally binarise/dim the image so dots keep >= 4:1 contrast.
4. Verify by decoding with @paulmillr/qr's decoder or jsQR before enabling download.

## 3. Physical sizing math

Geometry: version v has N = 17 + 4v modules per side (v1 = 21 ... v40 = 177); quiet zone = 4 modules each side (Micro QR: 2). https://www.qrcode.com/en/about/version.html

```
modules_total = N + 8
module_mm     = printed_width_mm / (N + 8)
```

Scan distance (10:1 rule): symbol width ~ scan distance / 10 (Scanova, Uniqode, Wave Connect). Uniqode adds 20-30% safety margin. Attribution to DENSO WAVE [unverified].

```
min_width_cm(distance_m) = distance_m * 100 / 10  (x 1.25 safety)
max_distance_m(width_cm) = width_cm * 10 / 100
```

Module size floors: DENSO WAVE: min printable module ~0.17 mm on 600 dpi laser; >= 4 printer dots per module; handheld scanners >= 0.25 mm. https://www.qrcode.com/en/howto/cell.html . Smartphone practice: >= 4 camera pixels per module; 2 x 2 cm practical minimum at arm's length; 1.5 cm absolute for 15-30 cm. The 0.4-0.5 mm rule of thumb is widespread but no primary source: use 0.4 mm as "warn" and 0.5 mm as "recommended".

Version growth: capacity (bytes) v1: 17/14/11/7 at L/M/Q/H; v40: 2953/2393/1841/1355. Raising ECC L->H at fixed data roughly halves capacity (a 40-byte URL fits v3-L at 29 modules but needs v4/5-H at 33-37 modules). https://scanova.io/blog/qr-code-capacity/

Output strings:
```
module_mm = W_mm / (N+8)
if module_mm < 0.4: "At W mm the module is {module_mm} mm, below the 0.4 mm safe minimum; print at >= {(N+8)*0.4} mm or shorten the content."
"Print at >= {ceil(D_m*10*1.25)} cm for a scan distance of {D_m} m."
"At W cm this code scans reliably up to ~ {W_cm/10} m."
```
Also warn: quiet zone >= 4 modules; contrast >= 4:1; dark-on-light preferred (scanners use red light; light/red foregrounds fail). Inverted codes: iOS 14+ and Google Lens generally decode; older Android/dedicated scanners often fail [unverified]; keep inversion behind a warning. Logo: ECC H tolerates 30% theoretically; practical <= 20-25% of area; keep finders/timing clear.

## 4. Export formats

| Format | Approach | Notes |
|---|---|---|
| SVG (primary) | One path from the matrix (M x y h1 v1 h-1z per module or merged rows), shape-rendering="crispEdges"; width="30mm" height="30mm", viewBox="0 0 N+8 N+8" | Physical size only honoured with units. Merge modules into one path to avoid anti-alias seams. |
| PDF | Browser: pdf-lib (stable, unmaintained) or jsPDF 4.2.1 (2026-03). Worker: @juit/qrcode emits PDF bytes. | 1 mm = 2.8346 pt. Both accept CMYK fills (pdf-lib cmyk(0,0,0,1); jsPDF setFillColor(c,m,y,k)) for 100% K black. Most universally accepted print format. |
| EPS | Hand-write PostScript: %!PS-Adobe-3.0 EPSF-3.0, %%BoundingBox, x y w h rectfill per module (qr-image does this). | ~40 lines. 0 setgray or 0 0 0 1 setcmykcolor. Rarely required in 2025; offer but default to PDF/SVG. |
| PNG @ DPI | Canvas/OffscreenCanvas -> blob -> insert pHYs chunk after IHDR (byte 33): length 9, type pHYs, ppuX/ppuY = round(dpi x 39.3701) big-endian, unit 1, CRC32. png-chunk-phys (Excalidraw uses it) or ~30 lines by hand. | Pixel size = mm/25.4 x dpi; 300 dpi default; integer pixels per module. https://slar.se/set-png-dpi.html |
| CMYK gotchas | SVG/PNG are RGB-only; warn when foreground is coloured. Black = 100% K, background = paper. | |

## 5. Content types and encodings (ZXing "Barcode Contents" is the de-facto spec)

| Type | Encoding | EA relevance / caveats |
|---|---|---|
| URL | full URL with scheme | Highest value; use short dynamic URL |
| vCard | BEGIN:VCARD VERSION:3.0 N:Last;First;;; FN:... TEL;TYPE=CELL:... EMAIL:... END:VCARD | Use 3.0 (broadest phone support). Omit PHOTO. |
| MeCard | MECARD:N:Owen,Sean;TEL:...;EMAIL:...;; (escape \ ; , " :) | 30-40% smaller; fewer fields. |
| WiFi | WIFI:T:WPA;S:ssid;P:pass;H:true;; (T = WPA/WEP/nopass; escape \ ; , " :) | Visitor WiFi: top EA use case. Escape backslash first. |
| Calendar | BEGIN:VEVENT SUMMARY DTSTART:20260601T070000Z DTEND END:VEVENT (wrap in VCALENDAR) | Reader support varies; native iOS Camera behaviour [unverified]. Write UTC. Safer: QR -> hosted event page with .ics. |
| Email / SMS / Tel | mailto:a@b?subject=..&body=.., sms:+1..:msg (also SMSTO:), tel:+1... | RSVP by SMS/email |
| Geo | geo:lat,lng | Venue pin |
| Text | raw | Fallback |
| App links | Apple https://apps.apple.com/...; Android market://details?id= or Play URL | Smart URL redirect by UA (dynamic mode) |

Most useful for an EA: event check-in/RSVP URL, visitor WiFi, vCard, feedback-form link, calendar hold, venue geo.
https://github.com/zxing/zxing/wiki/Barcode-Contents

## 6. Dynamic vs static QR and scan tracking

- Mechanics: QR encodes https://short.domain/q/{id}; Worker looks up destination (KV/D1), logs, 302s. Editable destination and shorter payload (20-30% smaller print).
- A "scan" = a redirect hit. Vendors report total vs unique, city/country, OS, hour/day.
- Pollution: search bots, security scanners, link-preview fetchers (Slack, iMessage, WhatsApp, Facebook) hit URLs when pasted; some scanner apps prefetch. Filter: ignore HEAD/non-GET; UA denylist (facebookexternalhit, Twitterbot, Slackbot-LinkExpanding, WhatsApp, TelegramBot, Discordbot, LinkedInBot, Googlebot, bingbot, generic bot|crawl|spider|preview|fetch) [completeness unverified]; behavioural heuristics; cf.botManagement only with paid Bot Management; count only when Sec-Fetch-Mode: navigate / Sec-Fetch-Dest: document present [heuristic]. Show "bots excluded" by default with a toggle.
- Privacy-respecting analytics: no cookies; visitor = sha256(dailySalt + IP + UA), salt rotated daily, raw IP/UA discarded; country/city/timezone from request.cf; OS bucket from UA. Workers Analytics Engine writeDataPoint (sampled at high volume; weight by _sample_interval) or D1 for exact counts at EA-scale volumes.

## 7. Nice-to-haves

- Bulk from CSV: PapaParse client-side; map column -> payload + label; generate N SVGs with uqr in a Web Worker; zip with fflate or lay out onto sheets.
- Frames + CTA: @liquid-js BorderPlugin or own SVG wrapper. Specific CTAs ("Scan for the menu") beat "Scan me" (vendor data, directional).
- Label sheets: no npm package ships Avery geometry. Options: @pdfme/generator 6.1.12 (MIT, has qrcode schema via bwip-js) with own template JSON, or draw with pdf-lib/jsPDF. Seed templates: Letter 5160 (66.7 x 25.4 mm, 3 x 10), 5163 (101.6 x 50.8 mm, 2 x 5), 5395 name badges, A4 L7160. 5160 margins from memory (top 12.7 mm, left 4.76 mm, column pitch 69.85 mm, row pitch 25.4 mm) [verify against Avery's PDF template]. https://pdfme.com

## Recommended architecture

Browser (SvelteKit client):
- Encoder: uqr (or @paulmillr/qr) -> matrix; live SVG preview.
- Styled mode: @liquid-js/qr-code-styling (SVG type) for shapes, gradients, logo, frame.
- Artistic/halftone mode: custom canvas renderer over the matrix, ECC forced to H, then decode-verify with @paulmillr/qr before enabling download.
- Exports: SVG (mm units), PDF (pdf-lib/jsPDF, CMYK 100K), EPS (hand-written), PNG (canvas + pHYs). All client-side; no upload of contact/WiFi data.
- Sizing calculator runs on N from the encoder.
- Bulk: Web Worker + fflate zip; label PDFs via pdfme or pdf-lib.

Cloudflare Worker (server):
- /q/:id redirect + analytics, bot filtering, daily-salt hashing, request.cf geo.
- Optional server-side render for OG images/API: uqr SVG or @juit/qrcode PNG/PDF. Avoid qr-code-styling, sharp, node-canvas, jsdom.
- Micro QR/rMQR (if offered): bwip-js toSVG in the Worker; warn that phone camera support is inconsistent [unverified].

Python (offline experiments): segno + qrcode-artistic to benchmark the JS halftone against a reference.

Key sources: https://www.qrcode.com/en/faq.html , https://scanova.io/blog/minimum-qr-code-size/ , https://www.uniqode.com/blog/qr-code-best-practices/how-to-perfectly-size-your-qr-codes , https://en.wikipedia.org/wiki/QR_code , https://qr-verse.com/en/blog/qr-code-error-correction-explained , https://github.com/excalidraw/excalidraw/pull/3530 , https://dev.to/will_indie/how-to-format-wifi-qr-code-payloads-safely-a-complete-client-side-sanitization-guide-2ie2 , https://dynamicqrcodelabs.com/blog/qr-code-analytics-guide/
