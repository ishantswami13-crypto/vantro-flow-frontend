# Starlane homepage, third pass

## Direction: "Operating Record"

Three concepts were drafted and scored by critics: Editorial Enterprise 72, Operational Intelligence 77, Institutional Futurism 61. The page combines them rather than taking the safest one.

- **Light editorial sections** carry the argument: paper and slab tones, a serif headline (Newsreader) and a serif lede.
- **Dark product rooms** carry the product: a key light, faint noise, and cropped, layered product surfaces.
- **One serif headline voice.** Every section H2 is Newsreader. Plus Jakarta Sans is used only for UI, and IBM Plex Mono for meta.
- **A proprietary record language.** Each entity is a 12-week strip with marks for invoice, payment, order, missed promise and action, plus change brackets and a "now" line. Evidence types are shown by line style: fact is solid, calculated has a dot, assumption is dashed, estimate is dotted.
- **A custom 16px glyph set** (gate, once, evidence, audit, read-only, signal, verified and others) instead of Lucide.
- **One fictional company, Halden Supply Co.**, labelled Illustrative wherever product figures appear.

## Storyboard as built

| # | Frame | Surface |
|---|-------|---------|
| 01 | Hero. A composed shot: source records behind, Today in the middle, "Needs a decision" brought forward. Below the actions sits a factual strip: Read-only connections, Every figure sourced, A person approves. | dark |
| 02 | Fragmented systems as an orthogonal architecture plate, with Live solid and Planned/Custom dashed. | light |
| 03 | One model of the business: the record plate, with swimlanes by external, customers, suppliers, stock and people. | slab |
| 04 | "07:42. Four things changed." The Watch room as full-width rows: change, figure, record strip, sources. | dark |
| 05 | Evidence as an exploded stack of 8 layers, from Observed to Verification. | light |
| 06 | "Compare before committing." The four real simulator options as p10–p90 ranges with the median marked. | dark |
| 07 | "It checks what happened next." The approval-to-observation timeline and a $60,000 macro. | slab |
| 08 | Integrations band with real Live, Planned and Custom marks (11, 16 and 10). | light |
| 09 | "Built for control." Six verified controls and a scope line. | dark |
| 10 | Close: a centred serif call and three steps. | dark |

## Reviews and what changed

**Design critique.** The critic said the page was a real step up but not yet at Harvey's level. The critique and the change made for each point:

- Two competing headline faces → one serif voice.
- S04 read as KPI tiles → rebuilt as Watch rows.
- Light pairs and dark pairs went flat → S07 moved to slab and S09 to dark.
- The hero's floating vertical label and dead meta line → label removed and a fact strip added.
- The CTA was empty → it is now a centred 104px serif line.
- Mono noise → the repeated captions and "+" crosshairs were removed. The illustrative label stays inside each plate.
- Corner-bracket ornaments → removed.

**Truth audit, checked against the backend.**

- **Gmail inbound does not detect promises.** Promises are logged by hand. The Communication row became "Promises · Payment promises your team logs · Promise log", the sources became "Promise log", and the copy became "Your team knows the promise."
- **Collections sends go out on WhatsApp, which is Planned.** The step became "Reminder, once: exactly the text approved, and only once."
- **Verification contracts resolve only at the 30-day horizon.** The day-8 step became "On track. The 30-day check stays open." The macro now says "Observed · on track."
- **FX impact is a range, not a point.** "≈ $9,400" became "$4.7k–$14.1k dearer · estimate".
- **ECB and USGS feeds sit behind a flag.** They are now labelled "opt-in", with "External feeds are switched on per pilot."
- **Custom means it can be built.** The wording became "Custom, can be built for a pilot", and the diagram key now reads "Planned or custom".
- **Source descriptions:**
  - TallyPrime is "accounting files".
  - Banking is "CSV or XLSX statements".
  - Sheets is "exports".
  - The sync is "the next sync".
- **Dates now agree.** INV-1042 is dated 29 Jul, so 47 days overdue on Net 30 is correct. The record marks match the invoice and promise weeks, the EUR jump falls in the last week (+2.1% since 7 Oct), and the Meridian bills include 24 Sep.
- **The $60,000 is a part payment.** It now shows "$2,400 left on it".
- **Accessibility:**
  - The mobile systems list is now exposed to screen readers.
  - The hero's screen-reader summary moved outside `role="img"`.
  - The control-item stagger variable is now set.

**Confirmed against code:**

- the approval queue and the atomic run-once claim
- the approved text is the text sent
- the append-only audit trigger
- messaging off by default
- simulator options and p10/p90 ranges
- "No language model produces these numbers"
- the read-only Tally bridge with a revocable credential

## Verification

- `tsc` and `next lint` are clean, and `next build` passes.
- axe reports no violations on /, /integrations and /security.
- There is no horizontal page scroll at 1440, 1280, 1024, 768, 430, 390 or 375. The hero's Today panel is a deliberate crop and is clipped inside the hero.
- Screenshots were taken from the production build: sections s01–s11, the hero, full pages w1440–w375, and a contact sheet.

## Still open

- No real customers, logos or metrics appear. The critic noted that Harvey and Linear win on proof. That gap only closes with real pilots.
- Live Harness checks and outbound sending remain the product's own launch gates. The page states the defaults honestly.
