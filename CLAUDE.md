# StoneQR

Free, open-source (MIT), browser-only QR code generator. Brand: StoneQR at stoneqr.app. Tagline: "QR codes set in stone. Generated in your browser, never expire." Sibling of the private SignUpCity product; dynamic codes hand off to SignUpCity, StoneQR itself has no server, no accounts, no database.

## Rules

- Read `plan.md` first; it is the source of truth for scope, architecture, and milestones. Building started 2026-09-02. M1 to M8 are built, including halftone with zoom and crop, the bulk page, and the `?short=` return leg. Still open: the real-device scan matrix in `docs/scan-matrix.md` and the remaining M7 extras.
- The generator has Basic and Advanced control sets (toggle above the columns, remembered in localStorage). Anything only Advanced exposes must be listed in `Design.advancedInUse` so Basic can say it is still in force.
- The call-to-action frame is our own SVG wrapper in `apps/site/src/lib/styled.ts`; do not reintroduce the styling library's border plugin (it sizes text as the whole code and needs a separate lazy chunk). Framed art is taller than wide: exports and the decode check go through the aspect-aware `svgToCanvas` and `Design.styledScale`.
- Halftone PNG export renders and encodes in `apps/site/src/lib/halftone.worker.ts`. Anything posted to it must be plain data (use `$state.snapshot` on reactive objects). Keep `renderHalftone` allocation-free in its inner loops; a 4096 px raster should stay around 200 ms.
- Commands from the root: `bun install`, `bun run dev`, `bun run test` (engine vitest), `bun run check` (svelte-check), `bun run build`, `./deploy.sh` (wrangler pages deploy). Bun uses isolated installs here, so packages live under `apps/site/node_modules` and `packages/engine/node_modules`, not the root.
- The engine's `index.ts` deliberately does not export the pdf-lib modules; import `@stoneqr/engine/export/pdf` and `@stoneqr/engine/labels` lazily from the site so the core chunk stays small (currently about 77 KB gzipped on the generator page, budget 150 KB).
- Claims about competitors or physics that appear on the site are tracked in `docs/claims.md`; verify before changing marketing copy.
- Nothing a user types may leave the browser in static mode. No server-side payload handling, ever.
- Every download must pass a decode check. Print safety is a feature, not polish.
- Stack: SvelteKit (Svelte 5) with adapter-static, TypeScript, bun workspaces, vitest; deploy as Cloudflare static assets with wrangler. Engine lives in `packages/engine` as `@stoneqr/engine`.
- Libraries: `uqr` for encoding, `@paulmillr/qr` for decoding with `jsqr` as a lazy fallback (the primary decoder misses about 1 valid symbol in 500), `@liquid-js/qr-code-styling` (lazy) for styled output, `pdf-lib` for PDF, hand-written EPS and pHYs. Do not add `sharp`, `node-canvas`, `jsdom`, or `@qr-platform/qr-code.js`.
- Research and sources: `docs/research/qr-technical.md`.

## Owner

Garrett Holmes, an Executive Assistant who builds side projects on SvelteKit and Cloudflare. He reviews and tests on real devices; expect him to ask for the scan matrix.
