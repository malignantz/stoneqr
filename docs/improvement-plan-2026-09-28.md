# Improvement plan: a calmer generator, and what to build next

Status: written 2026-09-28 from an audit of the code and the running dev build, plus outside
research. Branch `declutter-2026-09`. Nothing here is deployed; nothing is committed until Garrett
asks. The rules in `CLAUDE.md` stay in force except where section 9 lists a rule this plan
changes on purpose.

The brief, from Garrett: "the front end has a lot going on / feels busy"; look at design,
function, and new features; think creatively; use research and best practice.

---

## 1. What the audit measured

Dev build, Chrome, measured from the DOM (visible elements inside `#generator`) and from
full-page screenshots at 1440 px and at phone width.

| Measure | Basic, empty | Advanced, URL typed | Advanced, frame + icon |
|---|---|---|---|
| Buttons visible | 38 | 65 | 74 |
| Drawn tiles (type, icon, preset) | 27 | 40 | 40 |
| Inputs, selects | 10 | 15 | 20 |
| Words of copy inside the tool | 265 | 279 | 397 |
| Always-on hints | 5 | 6 | 9 |
| Generator height at 1440 × 900 | 1,554 px | 2,034 px | 2,613 px |
| Left design sheet (Logo, Style, Artistic QR) | 1,057 px | 1,536 px | 2,115 px |
| Size and download sheet | 1,190 px | 1,290 px | 1,393 px |

| Phone, 375 × 812 | Basic | Advanced |
|---|---|---|
| Whole page | 6,313 px, 7.8 screens | 7,061 px, 8.7 screens |
| Generator alone | 3,880 px | 4,628 px |
| Primary download button, from the top | 3,617 px | 4,302 px |
| Header | 95 px, seven links scrolling sideways (566 px of links in 375) | same |

The tool's top edge sits 352 px down a 900 px laptop screen: the header is 57 px and the hero
(two-line cut heading, two-line lede, toggle row) takes the rest.

### Why it reads as busy

1. **Everything is offered before anything is asked for.** A visitor who has typed nothing is
   shown 10 type tiles, 12 logo icons, 5 presets, three colour fields, four size cards, and four
   dead download buttons. The one thing they must do, type an address, is one field among 38
   buttons.
2. **Three columns of equal weight, and the product is the smallest of them.** The preview card
   is 536 px tall between two columns of 1,000 to 1,200 px. The eye has no resting place.
3. **The Size and download sheet is the tallest thing on the page in Basic**, and 560 px of it is
   four size cards that each carry three lines of copy.
4. **Small capitals everywhere.** Fifteen uppercase tracked labels on first paint: Type, Web
   address, No logo? Use an icon, Colours, Code, Background, Corners, Shape, Preset, Frame, Print
   size, Files, Share this design, Preview, Show. Several are a label under a label that says the
   same thing ("Shape" over "Preset"; "Size and download" over "Print size").
5. **Helper copy is permanent.** The share link's 40-word explanation is on screen from the first
   paint, for an action few people take and nobody takes first.
6. **Rare controls have front-row seats in Basic:** the Corners colour, MeCard beside vCard,
   Place, SMS.
7. **The hero and the header spend the first third of the screen.** Seven nav links, of which two
   (WiFi, vCard) are content types the generator already offers one click away.
8. **On a phone the download is four and a half screens down.** The pinned bar rescues it, but
   only after the preview has scrolled away.

What is already right and stays: the live preview, the decode badge, plain-language size copy,
drawn tiles instead of words, the summaries on folded panels, the pinned phone bar, the
Basic/Advanced split with `advancedInUse`, the "set in stone" look.

---

## 2. What the research says

Full notes and links are in section 12. The parts that decide things:

- **Progressive disclosure works at two levels and fails at three** (NN/g). Basic/Advanced is
  level one; a tab or a fold is level two. So nothing in this plan nests a fold inside a fold
  inside a mode.
- **Wizards suit novices doing a task once; they are wrong for creative or repeated work**
  (NN/g). The generator stays one page with a live preview. No stepper.
- **Accordions fail when people need several sections at once; tabs suit a few parallel groups
  with one- or two-word names** (NN/g). Logo, Style, and Artistic QR are three parallel groups,
  one of which switches the other two off: tabs.
- **Collapsed sections must say what is inside** (Baymard). Already the rule here; tabs keep it.
- **Help that is needed to finish the task stays on screen; everything else does not** (NN/g).
- **The simple competitors ask for one input and lead with whole designs** (Adobe Express,
  Uniqode, Hovercode, QRBTF). The cluttered ones show every type and every frame at once
  (ME-QR). QRCode Monkey, the closest comparison, is type tabs plus four accordions.
- **The open-source peer's own issue tracker asks for the same two things**: keep the preview
  visible, and a "paste and go" simple mode (mini-qr issues 9 and 14).
- **Demand elsewhere:** a reader/scanner, paste-to-detect, more payload types (WhatsApp,
  payments), transparent PNG (done), CMYK (done), JSON design import (done), npm/Node use.
- **Trust:** QR phishing is rising fast and "no tracking" generators are now common, so the
  claim needs showing, not saying: show exactly what the code contains, and say when an address
  goes through somebody else's redirect.

---

## 3. Targets

Measured the same way as section 1, on the finished branch.

| Measure | Now | Target |
|---|---|---|
| Tool top edge at 1440 × 900 | 352 px | 240 px or less |
| Generator height, Basic, empty, 1440 px | 1,554 px | 950 px or less |
| Buttons visible, Basic, empty | 38 | 26 or fewer |
| Uppercase labels, Basic, empty | 15 | 8 or fewer |
| Words inside the tool, Basic, empty | 265 | 160 or fewer |
| Size and download sheet, Basic | 1,190 px | 520 px or less |
| Generator height, Basic, phone | 3,880 px | 2,400 px or less |
| Initial JavaScript for `/` | about 97 KB gzipped | under 150 KB, and no more than 110 KB |
| Tests, type check, goldens | 337 pass, 0 errors | all pass, no golden regenerated |

No new runtime dependency. No change to any renderer, export, or golden file. Nothing typed
leaves the browser.

---

## 4. Wave 1: declutter

Five workstreams, run in parallel, each owning its files. Contracts between them are in
section 4.6 and are binding: build to the contract, not to what the other stream's code looks
like today.

### 4.1 WS-A: the shell

Owns: `lib/generator/Generator.svelte`, `lib/components/Tabs.svelte` (new),
`lib/components/tabs.ts` (new, the keyboard action), `routes/+layout.svelte`, `lib/site.ts`,
the hero snippets in `routes/+page.svelte` and the five landing pages (heading and lede only),
and in `app.css` the classes `hero-cut`, `nav-*`, and a new `tabs` block.

1. **Design tabs.** The second sheet in the left column stops being three stacked panels
   divided by rules and becomes one sheet headed by a tab list: **Style, Logo, Artistic QR**.
   - `Tabs.svelte` is dumb: `tabs: { id, label, on?: boolean, off?: boolean }[]`, `bind:value`,
     `ariaLabel`. It renders `role="tablist"` with `role="tab"` buttons, `aria-selected`,
     `aria-controls`, a roving `tabindex`, and Left/Right/Home/End through a `tabKeys` action
     modelled on `components/radiogroup.ts`. `on` draws a small accent dot after the label
     (something is set in there); `off` draws the label struck through in `ink-3` (the group
     is switched off by Artistic QR).
   - All three panels stay mounted whichever tab is showing. `LogoPanel` holds an effect that
     keeps a built-in icon following the code colour, and it must keep running while the Style
     tab is in front. The panels are passed `tabbed` and `open={tab === id}` (contract 4.6.1).
   - Default tab: Style on `/`, `/wifi`, `/vcard`, `/event`; Logo on `/logo`; Artistic QR on
     `/photo`. `Generator`'s props change from `styleOpen` / `photoOpen` to
     `tab?: 'style' | 'logo' | 'artistic'` (default `'style'`); update the five landing pages.
     A client-side navigation to a landing page sets the tab that page asks for; otherwise the
     tab is left where the visitor put it. If a picture is restored and `design.halftoneActive`
     is true on load, open Artistic QR.
   - Opening the Style or Logo tab calls `preloadStyled()` as the headers' `onopen` did.
   - Under the tab list, only when an inactive tab has something set, one line in ticket type:
     `Also set: Logo · wifi icon` (from contract 4.6.2). This keeps the rule that folding hides
     nothing.
   - Tab dots: Style `on` when `styleSummary(design)` is non-empty; Logo `on` when
     `design.logo`; Artistic QR `on` when `design.halftoneActive`. Style and Logo are `off`
     while `design.halftoneActive`.
2. **The Basic/Advanced toggle** loses its "Show" ticket (the group keeps
   `aria-label="Control set"`) and stays in the hero row.
3. **Hero.** On generator pages the heading is one line from `lg` up and the lede is one
   sentence. Add a `hero-tool` modifier: `font-size: clamp(1.6rem, 3.4vw, 2.6rem)`. The home
   lede becomes "Generated in your browser, never uploaded, never expire." with the second
   sentence removed (the three claims it made are repeated in the section under the tool). The
   landing pages keep their own headings under the same size rule and trim the lede to one
   sentence; do not change what any of them claims. The heading/toggle row remains a breakpoint
   rule, never a flex-basis.
4. **Header.** `NAV` becomes Generator, Bulk, Print size, Never expires, Open source. WiFi and
   vCard leave the header; both stay in the footer's Tools list, the sitemap, and the home
   page's copy. (Wave 2 adds Scan after Print size.) Check the phone header: five links must fit
   375 px without sideways scrolling at the current type size; if they do not, shorten
   "Never expires" to "Why" only with the PM's agreement.
5. **The grid stays as it is**: three columns from `lg`, one column below in the order Content,
   Preview, Design, Size and download. The left wrapper is still `display: contents` below `lg`.
   The rule between panels (`<hr class="rule">`) goes, since there is now one panel showing.

Done when: the tool's top edge is at or above 240 px at 1440 × 900; tabs work by mouse,
keyboard, and screen reader roles; changing the code colour on the Style tab recolours a
built-in logo icon; `/logo` and `/photo` open on their tabs; client-side navigation between
landing pages stays fetch-free.

### 4.2 WS-B: Size and download

Owns: `lib/generator/ExportPanel.svelte`, `lib/generator/sizes.ts`,
`lib/components/TierPicker.svelte` (new), and in `app.css` the `tier*` block.

1. **Basic size picker: four tiles in a row, one sentence under them.**
   - `TierPicker.svelte`: a `role="radiogroup"` of four tiles using `radioKeys` and a roving
     `tabindex`. Each tile: the name ("Small", "Medium", "Large", "Extra large"), one word of
     use in `ink-3` ("cards", "flyers", "posters", "banners"; add `short` to `SizeTier`), and
     the size in `.num` as `50 mm · 2 in`. Four across from 22 rem; two by two in the 18 rem
     band between `lg` and `xl` and on phones narrower than 360 px.
   - Under the tiles, one sentence for the chosen tier, built from the existing fields:
     "Flyers, menus, table tents, handouts. Read across a table, up to about 50 cm (20 in)."
     The distance still comes from `tierDistance`, so the rule stays in one place.
   - A tier that is `tight` or `small` for the content carries a small warn or block mark on
     its tile and the words in its accessible name; the sentence under the row says
     "Tight for this content" or "Too small for this content" when the chosen tier is one.
   - A hand-set width shows as a fifth, selected "Custom" tile (`37 mm · 1.5 in`) with the
     sentence "Set in Advanced. Pick a size to replace it."
   - The "Print size" and "Files" subheads go in Basic. Advanced keeps "Print size",
     "Encoding", "Files".
2. **Basic downloads.** One accent button, "Download PNG" with its pixel size, then one row of
   three: PDF, SVG, Copy. The hint "PNG for documents…" goes; the tickets on the buttons
   ("print", "vector") already say it. Under the row, one line: "Printing a lot of them?
   <button>Print a test sheet first</button>." wired to the existing `testSheet()` (disabled
   with the same reason while Artistic QR is on). This also closes audit item 13's test-sheet
   half: Basic now offers what the home page promises.
3. **Advanced encoding folds.** The Encoding group becomes a collapsible `SectionHeader`
   (`level={3}`), folded unless something in it is not the default, with the summary
   `M · quiet 4 · mask auto` (version added when `minVersion > 1`).
4. **Share leaves this panel** (it moves to the design menu, WS-C). Delete the block, its state,
   and the `hr`; keep `encodeHash` imports out if unused. `SITE.promise` stays, once, under the
   buttons.
5. **Disabled downloads must still read as buttons.** `.btn-secondary:disabled` at 0.4 opacity
   on basalt all but vanishes. Give disabled secondary buttons `opacity: 1`, `color: ink-3`,
   `border-color: rule` (the accent button already has its own disabled treatment). This is the
   one site-wide disabled rule in `@layer base`/components; change it there, not per button.
6. `PreviewBar` is untouched.

Done when: the Basic sheet is 520 px or less at 22 rem; arrow keys move between tiers; the
four tiles and the Advanced chips still agree on which width is chosen; every export path still
runs (PNG, SVG, PDF, EPS, copy, test sheet, Artistic QR PNG with progress).

### 4.3 WS-C: Content

Owns: `lib/generator/ContentForm.svelte`, `lib/generator/DesignMenu.svelte` (new),
`lib/generator/detect.ts` (new) with `apps/site/test/detect.test.ts` (new), and in `app.css`
the `type-tile` block and a new `menu` block.

1. **Six tiles, then the rest.** The type grid becomes three columns by two rows with the icon
   beside the word, so every word fits and the `SHORT` map can go: **Link, Text, WiFi, Contact,
   Email, More**. "More" is a disclosure button (`aria-expanded`), not a radio; open, it adds
   rows of three for SMS, Phone, Location, Calendar event. It starts open when the chosen type
   is one of those (so `/event` shows its tile selected) and remembers being opened for the
   session. The "Type" label goes; the group keeps its `aria-label`. The one-line description
   under the grid stays.
   - The tile says "Link", the field label stays "Web address", the engine id stays `url`.
2. **Contact is one tile.** It selects `vcard`. In Advanced, a segmented control at the top of
   the form offers the format: "vCard · more fields" and "MeCard · smaller code". Switching
   copies the typed fields across (`title` is dropped going to MeCard and kept in the vCard
   record), then sets `design.type`. A design whose type is `mecard` still shows Contact
   selected in Basic, and `advancedInUse` reports it (contract 4.6.3).
3. **Paste and go.** `detect.ts` is pure: `detect(text): Detected | null`, where `Detected` is
   `{ type: PayloadType; fields: Partial<Fields[type]>; label: string }`. It recognises, in this
   order: `WIFI:` strings (unescaping per the WiFi encoder), `BEGIN:VCARD`, `MECARD:`,
   `BEGIN:VCALENDAR`/`BEGIN:VEVENT`, `mailto:`, `sms:`/`smsto:`, `tel:`, `geo:`, a bare email
   address, a bare phone number (a leading `+` or at least seven digits with only spaces,
   dashes, dots, and brackets between), otherwise nothing. It never guesses a URL into
   something else. Tests cover each form, the round trip `payloads.x(fields)` → `detect` →
   same fields for WiFi, mailto, sms, tel, geo, and that ordinary URLs and prose return null.
   - In the Link and Text forms, when `detect` finds something, a `notice-info` under the field
     says "That looks like an email address." with a button "Make an email code", which sets
     the type and fields. Nothing changes until the button is pressed.
4. **The design menu.** `DesignMenu.svelte` replaces the "Save" and "Start over" text links in
   the Content heading with one button (icon `more`, three dots; `aria-label="Design menu"`,
   `aria-haspopup="menu"`). It is always shown. The menu is a modal `<dialog>` anchored to the
   button, exactly the pattern `ColourPopover` uses, so a click outside closes it and is
   swallowed. Items, `role="menuitem"`, arrow keys to move, Escape to close:
   - Save this design… / Saved designs (n) → opens the existing `SavedDesigns` modal
   - Copy a link to this design
   - Start over (disabled while pristine; asks once, inline, "Clear everything?" as now)
   - Wave 2 adds Undo and Redo at the top.
   The share logic (`encodeHash(compact(snapshot(design), defaults()))`) moves here from
   `ExportPanel`. After copying, a `notice-info` appears under the Content heading for eight
   seconds: "Link copied. It carries these settings and everything typed here{, the WiFi
   password too}. {Pictures are not included.} It is not sent to StoneQR." If the clipboard is
   refused, the notice holds the link in a read-only field instead and stays until dismissed.
   The "Clear dynamic link" control for a dormant `shortUrl` stays where it is.
5. Add `more` (three dots) to `lib/icons.ts`. This is the only edit WS-C makes there.

Done when: Basic shows six tiles; every type is still reachable by keyboard; `/event` and
`/wifi` still preselect; pasting `WIFI:T:WPA;S:Cafe;P:latte;;` into the Link field offers a
WiFi code and fills SSID, security, and password; the share link still round-trips
(`persist.test.ts` untouched and green).

### 4.4 WS-D: Style, Logo, and Artistic QR panels

Owns: `lib/generator/StylePanel.svelte`, `LogoPanel.svelte`, `HalftonePanel.svelte`,
`lib/generator/summaries.ts` (new) with `apps/site/test/summaries.test.ts` (new),
`lib/palettes.ts` (new) with `apps/site/test/palettes.test.ts` (new), the `advancedInUse`
getter in `lib/generator/state.svelte.ts`, and in `app.css` a new `palette` block.

1. **Tabbed mode** per contract 4.6.1: each panel takes `tabbed`; when set it renders no
   `SectionHeader` and shows its body while `open` is true (read live, not latched). The
   untabbed path stays working for any page that still uses it.
2. **Summaries move out** to `summaries.ts` as pure functions of the design (contract 4.6.2);
   the panels import them. The Artistic QR summary grows to name what is set inside (audit
   item 15): picture name, tone or "off", "cropped" when zoom or offsets are not the default,
   "Cut 62%" when the threshold is not the default, "Shape colour" as now, and "tuned" when dot
   size, fade, or contrast is not the default.
3. **Style in Basic is three quiet groups with no doubled labels.**
   - *Colours*: Code and Background side by side, the contrast badge on the group's line as
     now, and under them a row of six palette dots (`palettes.ts`): each sets `fg`, sets `bg`
     to white, and clears `cornerColor`. The dot whose pair is in force is marked. Every
     palette must pass `contrastRatio(fg, '#ffffff') >= 7` and `isReddish(fg) === false`; the
     test pins both. Names are plain ("Black", "Navy", "Forest", "Plum", "Slate", "Teal");
     choose hexes that pass, not ones that merely sound right.
   - *Corners* leaves Basic. It is an Advanced field, in the same place. `advancedInUse`
     reports "corner colour" when `cornerColor !== null`.
   - *Preset*: in Basic the group's subhead is "Preset" and the `Swatches` carries no second
     label. In Advanced the subhead is "Shape" and the four rows keep their labels.
   - *Frame*: no subhead in Basic; the switch reads "Frame with a call to action". Its opened
     state is unchanged.
4. **`advancedInUse` repairs** (audit items 12 and 18): add "module shape" when `look` is
   custom and `dot !== 'square'`; reword to match the controls: "scan distance" → "read-from
   distance", "PNG resolution" → "PNG detail", "gradient" → "gradient fill", "corner shapes"
   → "corner frames and dots"; add "corner colour" and "MeCard contact format" (4.6.3).
5. **Retired words** (audit item 16): the Artistic QR subhead "Look" becomes "Tone". The Cut
   slider's end labels "Paper" and "Ink" stay: they describe tone, not the colour fields, and
   the hint beside them uses the same words. Record that decision in the audit file.
6. **Logo panel**: the label over the icons reads "Or use an icon" in both states where it is
   shown. No other change; the crop, the treads, and the warnings are not touched.
7. **Artistic QR panel**: the closing hint shrinks to one sentence in Basic ("Artistic QR
   downloads as PNG or SVG.") and keeps the Advanced sentence about H and version 7. The hint
   that lists what Advanced adds now names all of it (audit item 19): "Advanced adds dot size,
   fade, contrast, and crop sliders."

Done when: `summaries.test.ts` and `palettes.test.ts` pass; with Modules set to Rounded and
square corners, Basic shows the "Advanced settings still apply" notice naming "module shape";
no subhead in Basic is directly followed by a lone label.

### 4.5 WS-E: copy that contradicts the code

Owns: the body copy (not the hero snippets) of `routes/+page.svelte`,
`routes/open-source/+page.svelte`, `routes/never-expires/+page.svelte`,
`routes/photo/+page.svelte`, `README.md`, `apps/site/static/llms.txt`,
`docs/audit-2026-09-06.md`.

Read `docs/claims.md` first. Change only what the audit names:

- Item 13: home page, README, `llms.txt`: EPS is "in Advanced"; the PDF is "100% K black for
  the plain style". The test sheet is now in both control sets, so that sentence stands.
- Item 14: `/open-source` names the Cloudflare Web Analytics beacon in the paragraph that tells
  readers to open the Network tab, and says it carries no content, as `/privacy` does.
- Item 17: `/never-expires` drops the sentence that says a hand-off to a link service is
  planned.
- Item 19: `/photo` describes the drag box and Zoom as the way to crop, with the sliders named
  as Advanced.
- Mark items 12 to 19 in `docs/audit-2026-09-06.md` as fixed 2026-09-28, one line each saying
  what was done, in the style of items 1 to 11.

Done when: every sentence changed is true of the branch as built; the OG tests still pass
(headlines are not touched).

### 4.6 Contracts between the streams

1. **Panel props.** `StylePanel`, `LogoPanel`, `HalftonePanel` accept
   `{ design, advanced, open?: boolean, tabbed?: boolean }`. With `tabbed`, no header is
   rendered and the body is shown exactly while `open` is true. Script-level effects run
   regardless.
2. **Summaries.** `lib/generator/summaries.ts` exports
   `styleSummary(design): string`, `logoSummary(design): string`,
   `artisticSummary(design): string`. Empty string means nothing is set. They take a
   `Pick<Design, …>` of plain fields so they can be tested without runes.
3. **Contact format.** The type ids do not change. "MeCard contact format" is reported by
   `advancedInUse` when `type === 'mecard'`.
4. **Share.** `ExportPanel` no longer offers the share link; `DesignMenu` does.
5. **`app.css`.** Each stream edits only the blocks named as its own and adds new rules in its
   own marked block. Nobody reformats the file.
6. **`lib/icons.ts`.** WS-C adds `more`. Wave 2 streams add their own, one line each.

---

## 5. Wave 2: features

Started only after Wave 1 is integrated and green. Six workstreams.

### 5.1 WS-F: a reader, and "remake it as a code that cannot expire"

New route `/scan`. Owns `routes/scan/+page.svelte`, `lib/scan/` (new), `lib/redirectors.ts`
(new) with tests, the `OG_ROUTES` entry, and the one-line additions to `NAV` and the footer.

- Take a picture of a code by file, drop, or paste from the clipboard. Decode it on the device
  with the decoders the site already ships (`@paulmillr/qr`, then `jsqr` lazily). No camera in
  this wave: `Permissions-Policy: camera=()` is a site-wide header and loosening it is
  Garrett's decision (section 8).
- Show what the code contains: the exact text; the type, through `detect()` from WS-C, laid out
  as fields; for a link, the address with the domain emphasised and never as a clickable link
  (a reader should not be a way to get phished).
- If the link's host is in `redirectors.ts`, say so in plain words: "This address goes through
  bit.ly, a redirect service. Whoever runs it decides where the link leads, and can change it
  or switch it off." Keep the list short and general-purpose (link shorteners and QR redirect
  domains that are publicly documented as such); every host goes into `docs/claims.md` with
  its source, and the wording claims nothing about any one company's expiry policy.
- "Make this a StoneQR code": hands the detected type and fields to the generator and navigates
  to `/`. `Generator.svelte`'s module script exports `openInGenerator(detected)`; it applies
  the fields to the shared design and leaves a pending type that the next mount honours
  instead of the page's preset. (WS-F makes this one addition to `Generator.svelte`; WS-H is
  the only other Wave 2 stream that edits the file, and the PM sequences the two.)
- A failed decode says what to try (crop closer, a sharper picture, more light), not
  "invalid".
- The page gets an explainer of 300 to 500 words, an `Seo` block, and an Open Graph card. After
  adding the route run `bun run fonts` and `bun run og` (the second needs a browser pointed at
  its local page; headless Chrome works), so `_headers`, `og-images.ts`, the sitemap list, and
  the tests agree.
- Nothing decoded is stored or sent. The picture is read into memory and dropped.

### 5.2 WS-G: show what is inside, and test it harder

Owns `lib/generator/Preview.svelte`, `lib/generator/Inspector.svelte` (new),
`lib/generator/stress.ts` (new) with tests for its pure parts.

- **Inspector.** Under the preview card, one line in both control sets: "Contains" and the
  payload, truncated to one line, with a button to open it in full (mono, wrapping, selectable,
  with the byte count in Advanced). For a link, the domain is emphasised and, when the host is
  in `redirectors.ts`, the same plain warning as `/scan` appears under the Link field's hint
  (through a small shared component, so the words stay the same in both places). This puts
  the site's main promise, that the code contains your content and nothing else, on the page.
  It replaces the phone-only repeat of `SITE.promise` under the preview.
- **Stress test** (Advanced, a button under the figures: "Test it harder"). Re-decodes the
  artwork that passed the normal check under six conditions: small (3 px a module), blurred
  (about 1.2 modules), dim (levels squeezed to the middle third), tilted 12°, sheared 10°, and
  small plus blurred together. Reports "Decoded in 5 of 6 tough conditions" and names the
  misses. It is advice, never a gate: it does not change `design.verify`, it is never written
  to `memo.ts`'s verdicts, and its copy says "a simulation on this device, not a promise about
  every phone". Yield to the page between decodes; the whole run should finish inside a
  second on a laptop.

### 5.3 WS-H: undo, redo, and keys

Owns `lib/generator/history.ts` (new) with tests, its wiring in `Generator.svelte`, and the two
menu items in `DesignMenu.svelte`.

- `History<T>`: `push`, `undo`, `redo`, `canUndo`, `canRedo`, a cap of 100, equal neighbours
  folded into one. Pure and tested.
- An entry is `{ saved: Saved, logo?: string, halftoneImage?: string }`; the pictures are held
  by reference, so a hundred entries cost one copy of each picture. Pushed 400 ms after the
  last change; applying an entry does not push one.
- Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z (and Ctrl+Y) when focus is not in an input, textarea, select,
  or contenteditable, so typing keeps its own undo. Cmd/Ctrl+S opens Save this design.
- Start over becomes undoable, and its notice says so.

### 5.4 WS-I: WhatsApp, email copies, campaign tags

Owns `packages/engine/src/payloads/whatsapp.ts` (new) and its test, `mailto.ts` and its test,
`payloads/index.ts`, the `Fields` types and `buildPayload` in `state.svelte.ts`, and the forms
in `ContentForm.svelte` (after WS-C has landed).

- **WhatsApp**: `https://wa.me/<digits>?text=<encoded>`. Digits only, 7 to 15, no leading zeros
  or plus; a number typed with spaces, dashes, brackets, or a plus is normalised; anything
  else is a `PayloadError` in the site's voice. Goes under More. The tile's icon is a generic
  speech bubble with a handset, not the brand's mark.
- **Email**: `cc` and `bcc` in the engine and, in Advanced, in the form. `advancedInUse`
  reports "email cc or bcc".
- **Campaign tags** (Advanced, folded under the Web address field): source, medium, campaign.
  Appended as `utm_source`, `utm_medium`, `utm_campaign`, keeping any query and fragment
  already there and replacing a tag of the same name rather than doubling it. The readout says
  what the tags cost: "Adds 58 characters; the code grows from 25 to 29 modules a side."
  `advancedInUse` reports "campaign tags".
- New fields go in `defaultFields()`, so `apply` accepts them and old records simply lack
  them. Add round-trip cases to `persist.test.ts`; do not change existing ones.

### 5.5 WS-J: templates

Owns `lib/templates.ts` (new) with `apps/site/test/templates.test.ts` (new), a row in
`StylePanel.svelte` (after WS-D has landed), and any drawing added to `shape-art.ts`.

- A template is a whole design in one tile: a look, code and background colours, an optional
  corner colour, an optional frame with its colours. Six to start: Plain, Navy rounded, Forest
  dots with copper corners, Slate leaf, Plum soft, and Boxed (black classic with a frame).
- Matched, never stored, the way looks are: `templateFor(design)` returns the template whose
  fields the design equals, or null. Applying one with a frame switches the frame on and sets
  its colours; it changes the frame's words only if they are still the default.
- First row of the Style tab, labelled "Template", drawn by `QrArt` in the template's own
  colours.
- The test pins, for every template: contrast of the weaker foreground at 4.5 or more, not
  reddish, not inverted, and `templateFor(apply(t)) === t.id`.
- Templates are new colour pairs on paper, so they owe the scan sheets a section. Add section
  `T` (T1 to T6) to `scripts/scan-sheets/` and `docs/scan-matrix.md` together; the build checks
  one against the other.

### 5.6 WS-K: share sheet, and the bulk page's list card

Owns `lib/components/PreviewBar.svelte`, the share button in `ExportPanel.svelte` (after WS-B),
and `routes/bulk/+page.svelte` (layout only).

- Where `navigator.canShare({ files })` is true, Basic's third small button is "Share" (the
  PNG through the system share sheet) instead of "Copy". Elsewhere it stays "Copy".
- `/bulk`: the list card has about 70 px of dead space above and below its field at 1440 px;
  tighten it to the rhythm of the Encoding card beside it. No behaviour changes.

---

## 6. Wave 3: not built in this pass

Each needs a decision, an account, or hardware. Listed so they are not lost.

| Idea | Why it waits |
|---|---|
| Camera scanning on `/scan` | Needs `Permissions-Policy: camera=(self)`; a header change and a line in `/privacy`. Garrett's call. |
| EPC / GiroCode payments | The standard fixes error correction at M and caps the version at 13, which collides with the logo's forced H. Needs a rule for which wins, and bank-app scans. |
| GS1 Digital Link builder | Timely for Sunrise 2027; needs GTIN check digits, application identifiers, and a retailer's scanner to test. |
| "See it in place" preview | The code drawn at true scale on a card, a table tent, a poster, a door. The most useful answer to "how big?"; a day of drawing. |
| Print templates | Table tent, poster, card back as PDFs, extending the label sheets. Large. |
| `/menu`, `/business-card`, `/sticker`, `/whatsapp` pages | One route and one card each; the copy needs writing with care. |
| `@stoneqr/engine` on npm, and a CLI | Needs the npm organisation and a `dist` build. Already in `docs/launch.md`. |
| Languages | The sizing copy and payload labels are most of the strings. Large. |
| QArt bit steering | Still behind the three-phone spike in `plan.md`. |

---

## 7. How the work is run

- One product manager (Opus 5.5) holds this plan, briefs the coders, reviews every diff, runs
  the gates, and keeps the documents true. Coders are Sonnet 5.5.
- Wave 1's five streams run together. Wave 2 starts after Wave 1's gates pass. Within Wave 2,
  F, G, I, J, and K can run together once their "after WS-x" notes are satisfied; H follows F
  because both touch `Generator.svelte`.
- A coder's brief carries: the section of this plan, the files it owns, the contracts, the
  rules from `CLAUDE.md` that bear on those files, and the gates. A coder that needs a file it
  does not own stops and says so.
- Coders run `bun run check` and the tests for their own modules. The PM runs the whole suite
  and the build, one at a time, so two builds never share `.svelte-kit`.
- Nobody commits, pushes, or deploys. Nobody regenerates a golden file. Nobody adds a
  dependency.

### Gates, after each wave

1. `bun run test`: every test passes; no file under `test/golden/` has changed.
2. `bun run check`: 0 errors, 0 warnings.
3. `bun run build && bun run budget`: initial JavaScript for `/` under 110 KB gzipped.
4. The measures in section 3, taken from the running dev build at 1440 × 900 and 375 × 812, in
   Basic and Advanced.
5. By hand in a browser: type a link, change the preset and a colour, add an icon logo, switch
   on the frame, download PNG, SVG, and PDF; switch to Advanced and back; reload and see the
   design restored; open a share link in a fresh profile; add an Artistic QR shape and see Style
   and Logo marked off; keyboard only through the tabs, the type tiles, the tiers, and the
   design menu.
6. `git diff --stat` reviewed against the ownership lists: no stream touched another's file.

---

## 8. Decisions for Garrett

None of these block the build; each has a default the plan follows.

1. **Tab order.** Style, Logo, Artistic QR, with Style in front on `/`. This keeps both of your
   earlier calls in spirit (Style open by default, the logo never buried: its tab is always in
   view, one click away, and marked when a logo is set) but it is a change from "Logo first".
2. **WiFi and vCard leave the header.** They stay in the footer, the sitemap, and the type
   picker. Say if you want them back for search reasons.
3. **Corners colour moves to Advanced.**
4. **The hero is one line on generator pages.** The cut lettering stays; it is smaller.
5. **Camera on `/scan`**: off until you say the header may change.
6. **The redirect-service list** names third-party domains on the site. It is worded as a
   description of what a redirect is, not a claim about any company, and every entry is in
   `docs/claims.md`.

---

## 9. Rules in `CLAUDE.md` this plan changes

The PM rewrites these sentences when the work lands, and adds a record to
`docs/ui-refresh.md` (§8q onward) and a milestone to `plan.md`.

- The phone order "Content, Preview, Logo, Style, Artistic QR, Size and download" becomes
  "Content, Preview, Design (tabs: Style, Logo, Artistic QR), Size and download".
- "The centre logo has its own panel … first in the design column and open from the start"
  becomes its own tab, second, marked when set.
- `Generator`'s `styleOpen` / `photoOpen` props become `tab`.
- "The colour fields are Code, Background, and Corners": Corners is Advanced only.
- Basic sizes are still the four tiers in `sizes.ts`; they are drawn as tiles with one sentence
  for the chosen tier.
- The share link is offered from the design menu in the Content heading.
- vCard and MeCard are one "Contact" tile; MeCard is an Advanced format.
- New: `summaries.ts`, `palettes.ts`, `templates.ts` (matched, never stored), `detect.ts`,
  `redirectors.ts` (every host tracked in `docs/claims.md`), `history.ts`, `/scan`.

---

## 10. What Garrett checks on hardware afterwards

1. iPhone and Pixel: the tabs, the six-tile picker with More, the four size tiles, the design
   menu, and the pinned bar; thumbs only, no zooming.
2. The Share button on both phones: the PNG arrives in Messages and in Files.
3. `/scan`: photograph a printed code, open the photo, read it, remake it.
4. Print `docs/scan-sheets.pdf` again: the new `T` rows join the rows still owed (C3, C4, L6,
   M1 to M4, N1 to N4).
5. A laptop at 1100 px wide: nothing in the 18 rem columns is clipped.

---

## 11. Risks

| Risk | Guard |
|---|---|
| A hidden tab stops an effect that must keep running | All three panels stay mounted; the icon-follows-colour check is in WS-A's "done when". |
| Tabs hide something that is in force | Dots on the tabs, the "Also set" line, and `advancedInUse` unchanged in purpose. |
| Moving the share link loses the privacy explanation | The notice after copying carries every clause the hint had, the WiFi password clause included. |
| `detect()` turns what someone meant as a link into something else | It only ever offers; nothing changes without a press. It never reinterprets a URL. |
| Parallel edits collide in `app.css` or `state.svelte.ts` | Named blocks and single owners; the PM's diff review is gate 6. |
| The redirect list makes a claim about a company | Wording describes the mechanism only; `docs/claims.md` lists every host. |
| A template's colours scan worse on paper than on screen | Contrast and hue pinned by test; section `T` on the scan sheets before any is promoted in copy. |
| The bundle grows | Templates and palettes are data; the reader is its own route; the gate is 110 KB. |

---

## 12. Research notes

Competitor layouts (from page text, not pixel inspection):

| Tool | Pattern | Note |
|---|---|---|
| QRCode Monkey | Type tabs and four accordions | Explicit "Create" button; about fourteen types. |
| qr-code-generator.com, QR.io, ME-QR | Three steps | Account or upgrade at download; ME-QR shows 40+ types and 1,000+ frames. |
| Uniqode | Type tabs and four design tabs | Templates first. |
| Hovercode | One page, live preview | Template gallery, a "test scannability" action. |
| Adobe Express | One field, then personalise | The simplest of the set. |
| QRBTF | Style carousel first | Parameters follow the chosen style. |
| mini-qr (open source) | One page | Presets, scanner, CSV batch, 30+ languages; issues ask for a persistent preview and a paste-and-go mode. |

Guidance used: NN/g on progressive disclosure, accordions on desktop, tabs, wizards, bottom
sheets, tooltips, and empty states; Baymard on collapsed summaries and field descriptions;
Hick's law. Practice: DENSO WAVE on the quiet zone and error correction levels.

Demand seen elsewhere: a form for building payload strings, custom batch file names, paste to
scan, transparent PNG, npm distribution, mailto with cc and bcc (mini-qr issues); Node support,
SVG logos in Illustrator, JSON import, CMYK (qr-code-styling issues); on Hacker News, praise for
client-side SVG and complaints about redirect generators that later charge, trimmed quiet
zones, and styled codes that do not scan.

Trends: QR phishing rose sharply through early 2026; GS1 Sunrise 2027 and the EU product
passport put QR codes on packaging; AI-art codes still circulate and still scan badly, which
supports the decode-checked halftone here.

Any figure from this section that reaches the site goes through `docs/claims.md` first.
