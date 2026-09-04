# Artistic QR: what the techniques are, what we already have, what is worth building

Research written 2026-09-03 after Garrett asked whether StoneQR should offer codes whose modules
form a recognisable shape (a WiFi glyph, a butterfly, a logo mark) rather than a photograph.
Section 7 records what was decided and built the same day; sections 1 to 6 are the research as
it stood before that.

Companion to `qr-technical.md`, which covers encoding, sizing, exports, and the halftone work we
shipped. This file only covers making a symbol look like a picture.

Provenance is marked throughout. **Read** means I read the source or ran the code. **Reported**
means it came from a fetched page or a summary of a source file, and a decision should not rest on
it without a second look.

## 1. The three techniques, and how to tell them apart

The words "artistic QR" cover three unrelated methods. They differ in what they spend.

**Halftone, or module shrinking.** Keep every function pattern solid (finders, separators, timing,
alignment, format and version info, the dark module). Draw each remaining module as a small dot at
the centre of its cell and let the picture show through the gaps. The code is unchanged and fully
valid; the picture lives in space the symbol was not using. From Chu et al., *Halftone QR Codes*,
SIGGRAPH Asia 2013. **This is what StoneQR ships as Photo QR.** See
`packages/engine/src/render/halftone.ts`.

**Bit steering, or QArt.** Do not damage anything. Instead choose the data bits themselves so that
after masking the finished pattern lands on a target image. Reed-Solomon encoding is linear, so the
free bits give a linear system you can solve. The result is a fully valid code with its entire
error-correction budget intact. Russ Cox, 2012. **Nobody we looked at implements this.**

**Overwriting.** Draw the shape straight over the finished matrix and let error correction absorb
the damage. Cheap to write, and it spends exactly the margin that print reliability depends on.
This is what most free "artistic QR" tools do. We should not ship it.

A fourth thing gets the same name but is not the same activity: **diffusion models with ControlNet**,
which generate an image conditioned on a QR code. That is image synthesis, not QR engineering.

## 2. The finding that matters most

**The "shape made of blocks" look does not need a new technique. It is halftone fed a one-bit
silhouette instead of a photograph.**

Reported, and worth confirming: the C# library Garrett thinks he used carries a `Binarizer.cs`,
which points at the input being thresholded to black and white before it is merged. I saw the file
in the tree listing but did not read it, so treat the mechanism as likely rather than settled. The
claim that does not depend on it is below, and it is the one that matters.

Verified by running our own engine with no changes: `artistic-qr-wifi-glyph.ts` in this directory
generates a one-bit WiFi glyph, renders it through `halftoneWithFallback` at the default dot size,
and writes `artistic-qr-wifi-glyph.png`. Reproduce with `bun docs/research/artistic-qr-wifi-glyph.ts`
from the repo root.

| Result | Value |
| --- | --- |
| Payload | A WiFi credential string |
| Version and size | 7, 45 modules |
| Error correction | H |
| Decode check | Passed on the first attempt, no fallback needed |

So the gap between what we have and what Garrett liked is a **threshold control**, not an engine.
We expose greyscale and contrast but no binarise step, so an uploaded logo comes out soft where it
should come out crisp.

## 3. Library evaluation

Three repositories were examined at Garrett's request.

### LapisDev/qr-art

C# on .NET Core, MIT. Not Python, so if the Monarch Manor butterfly definitely came from Python it
was a different tool, most likely segno with `qrcode-artistic`, which uses the same method.

Reported, from `src/Lapis.QRCode.Art/Merger.cs`: it copies the background image, then writes the
true code value into the centre of each three-by-three block (`result[r*3+1, c*3+1] = qrCode[r,c]`),
filling finder and alignment positions with solid blocks. Timing and format protection was not
visible in the part that was read. It borrows its QR encoder from Kazuhiko Arase's generator.

Verdict: our halftone renderer, module for module, with a fixed three-by-three grid where ours has
a tunable dot scale. No decode check anywhere in it.

### shadowmoose/Q-Art-Codes

TypeScript, MIT, depends on the `qrcode` npm package. Despite the name it is **not** QArt.

Reported, from `src/qr-builder.ts`: it draws the background image, then paints modules on top,
shrinking any module not marked `reserved` by a scale factor while leaving finder, timing, and
alignment at full size. It never re-encodes or alters data, and forces version 2 or higher for
robustness. No decode check.

Verdict: the same technique again, arrived at independently. Worth remembering that the name of a
repository is not evidence about its algorithm.

### duanxianpi/artistic-qrcode-generator

Python, MIT, Stable Diffusion with ControlNet via HuggingFace Diffusers, shipped as a Docker image
that wants `--gpus all`. Reported: no scan verification documented.

Verdict: incompatible with this product, on three counts. It needs a GPU server, the prompt and
content leave the device, and diffusion output scans unreliably without a verification step. It
would break the promise the site is built on. Not a maybe.

### What we already have over all three

None of them checks that the finished image still decodes. Ours renders, decodes with
`@paulmillr/qr`, and steps down through progressively safer settings until it reads, reporting in
plain language what it had to change. That is the real differentiator and it should stay in the
marketing copy. Route any comparative claim through `docs/claims.md` first.

## 4. QArt in detail, if we want it

Still the only technique here that costs no error correction, and now clearly a differentiator,
since even the repository named for it does not implement it.

**How it works.** The encoder's output is a linear function over GF(2) of the message bits. Fix the
bits you care about (the payload), leave the rest free, then solve for free-bit values that make
chosen module positions match the target image after masking. Reserved areas cannot be steered.

**Where the free bits come from.** Two sources, and the choice matters to us.

- *Trailing junk in the payload.* Cox's demos append random-looking characters to a URL. We should
  not do this: the site's promise is that the code contains what you typed.
- *Standard padding bytes.* When the content is shorter than the version's capacity, the padding
  (`0xEC 0x11` repeating) is free space. Nudging to a denser version buys picture room without
  touching the content. **This is the option that fits our ethos.**

**Constraints to design around.**

- URL and text only. WiFi, vCard, and calendar payloads have no safe slack, and their content is
  exactly what must not change.
- The picture is one bit per module and only in the data region. A silhouette or a glyph works. A
  wordmark does not.
- It needs an encoder we control. The engine wraps `uqr` as a black box (`packages/engine/src/encode.ts`),
  so this means our own data codewords, Reed-Solomon generator, GF(2) solve, and mask choice.
  Milestone-sized, comparable to the halftone work, plus tests.

**Licensing.** The reference implementation is `github.com/rsc/qr`, Go, BSD 3-Clause (verified via
the GitHub API). A port into this MIT project needs the attribution handled deliberately, not
assumed.

## 5. Options, cheapest first

1. **Threshold control on Photo QR.** Add a binarise step with an adjustable threshold so an
   uploaded logo or glyph becomes a clean silhouette. Optionally ship a small set of built-in
   glyphs (WiFi, wireless, arrow, heart). This is where the value is and it is a control plus a
   preset, not new machinery. Naming: the interface says "Photo QR" today, so a silhouette mode
   needs a user-facing name in the same plain register.
2. **QArt as a separate lazy module.** Keep `uqr` for everything else. Gate to URL and text, take
   free bits from padding rather than altering content, run it through the existing decode check.
3. **Nothing from the diffusion family.** Recorded here so the question does not get reopened
   without the reasons attached.

## 6. Open questions for the session

- Does a silhouette mode want its own entry in the interface, or is it Photo QR with the threshold
  turned up? The second is less to explain and less to build.
- How coarse is too coarse? Worth rendering a real logo at versions 5, 7, and 10 before promising
  anything about logos rather than glyphs.
- For QArt, is a denser symbol an acceptable price? It means a physically larger print for the same
  scan distance, which the print-size calculator would need to say out loud.
- Does any of this change the scan matrix in `docs/scan-matrix.md`? A silhouette changes the
  distribution of dark modules, which is exactly the sort of thing real-device testing exists for.

## Sources

- Chu et al., *Halftone QR Codes*, SIGGRAPH Asia 2013. Technique behind our Photo QR.
- Russ Cox, *QArt Codes*, 2012: https://research.swtch.com/qart and https://github.com/rsc/qr (BSD-3).
- https://github.com/LapisDev/qr-art (C#, MIT)
- https://github.com/shadowmoose/Q-Art-Codes (TypeScript, MIT)
- https://github.com/duanxianpi/artistic-qrcode-generator (Python, MIT, GPU)
- segno with qrcode-artistic, already covered in `qr-technical.md` section 2.

## 7. Decisions and what was built (2026-09-03)

**Built: option 1, the silhouette.** The gap really was a threshold, and it took one evening.

- Engine: `HalftoneOptions.threshold` (0.05 to 0.95, unset means off). Applied in `prepareSource`
  on the source pixels after greyscale and contrast and before the fade, so the fallback ladder's
  fade rungs still soften a silhouette that will not decode. Greyscale is forced on when a cut is
  set. `prepareImage()` is exported for anyone who wants the adjusted picture itself.
- Site: a three-way "Show as" control in the Photo QR panel (Colour, Black and white, Silhouette)
  replaces the black-and-white checkbox, with a Cut slider labelled Paper to Ink that is Basic; the
  percentage readout is Advanced. Seven built-in shapes (WiFi, heart, star, arrow, map pin,
  envelope, tick) live in `apps/site/src/lib/glyphs.ts` as small SVGs that go through the same
  data-URL path as an upload, so they needed no engine change and the vector export keeps them as
  vectors. Picking one switches the tone to Silhouette.
- SVG export: the cut is reproduced as a filter chain on the original picture (saturate to grey,
  optional contrast, a `feComponentTransfer` linear ramp with slope 512 crossing 0.5 at the cut, then
  a two-entry table mapping 0 to the ink colour and 1 to the paper colour with the fade folded into
  the ink end), so the file stays editable and matches the raster that was verified.
- A `/photo` landing route opens the panel and targets "photo qr code", "qr code with picture",
  and "artistic qr code generator".
- Tests: engine threshold behaviour, colours, fade interaction, clamping, decode at 8 and 3 px per
  module, and a hard-edged disc; site tests pin the filter chain and the glyph documents.

**Deferred: option 2, QArt.** A second research pass (see the summary in `plan.md` "Later") found
it is medium rather than milestone-sized: `@paulmillr/qr` publicly exports `drawTemplate`,
`zigzag` (placement with the mask bit per module), `interleave` (the linear data-to-codeword map,
so feeding it unit vectors builds Cox's basis directly), and the capacity tables. Padding-only
steering of a 30-byte URL controls roughly 56% of the data region at version 5 ECC L, 63% at
version 7 L, 70% at version 10 L, 53% at version 10 M, and only 10 to 26% at ECC H, where whole
Reed-Solomon blocks are frozen and scatter as a lattice through the picture. So it only pays at L
or M, which sits awkwardly next to a product that forces H whenever a picture is present, and it
would want its own scan-matrix rows before any promise is made. Decision: not now; gate on a spike
that decodes on three phones at ECC M, version 10, from a 50 mm print. Licensing if ported:
BSD-3 notice kept in the file, full text in a third-party licenses file, no "by Russ Cox" in
marketing.

**Rejected for good: diffusion.** Unchanged from section 3.

Answers to the section 6 questions: the silhouette is a tone inside Photo QR, not a separate
entry; a real logo should still be rendered at versions 5, 7, and 10 before "logo" appears in
copy (the `/photo` page says "logo, icon, or shape" and stops there); a denser symbol for QArt is
the open cost; and yes, the scan matrix gained silhouette rows.
