# Starlane product film — capture specification

No video exists yet. This is the exact spec for the first one, to close the "product in motion" gap on the homepage without any placeholder or synthesized footage.

## Sequence

One continuous capture, no cuts, no narration, minimal mouse movement:

1. **External event appears** (0:00–0:03) — `/intelligence` list view, the single "Supplier exposure detected" card visible against an otherwise calm, empty list.
2. **Signal opens** (0:03–0:05) — click into the card; the Impact view loads with the four top metrics (Revenue exposed, Time to stockout, Affected orders, Confidence).
3. **Evidence opens** (0:05–0:09) — click "View evidence"; the drawer slides in, scroll to show at least two distinct evidence-kind badges (e.g. Observed, Forecast) side by side.
4. **Forecast and decision** (0:09–0:14) — close the drawer, scroll to the forecast timeline, then the Without-action / With-action comparison card.
5. **Approve and execute** (0:14–0:18) — click "Approve & execute," hold on the real result card ("Executed via Demo ERP Adapter") for at least 2 seconds as the final frame.

Total: 15–18 seconds.

## Technical spec

| Property | Value |
|---|---|
| Resolution | 2560×1440 minimum (allows crop headroom for both the 16:9 desktop cut and a 4:5 mobile cut) |
| Frame rate | 30fps (60fps only if file-weight budget allows — this is UI, not fast motion) |
| Aspect ratio (desktop) | 16:9 |
| Aspect ratio (mobile) | 4:5, re-cropped from the same source — do not shoot separately |
| Format | MP4 (H.264) for broad support, WebM (VP9) as a secondary source for smaller weight |
| Target file weight | Under 3MB for the desktop cut, under 1.5MB for the mobile cut — re-encode/trim before shipping if over |
| Audio | None. No narration, no music. |
| Cursor | Visible but minimal — deliberate clicks only, no idle wandering |

## UI state requirements

- The demo tenant must be freshly reset (`node scripts/seed-2xa-demo.js && node scripts/trigger-2xa-event.js`) immediately before recording, so the numbers match what's already documented on the homepage (₹35,50,000 / 12.5d / 3 orders / HIGH).
- Browser chrome must not be visible in the final crop — capture full-screen or crop browser UI out in post.
- The "Simulated demonstration" label must remain legible in at least the opening and closing frames.
- Do not resize the browser mid-capture.

## Poster frame

Frame at 0:09 (the forecast timeline, just before scrolling to the decision comparison) — it's the moment that shows the causal chain and a forecast in the same view, the clearest single-frame summary of what the product does.

## Player treatment (for whoever wires it in once the file exists)

- Custom poster image + a single centered play control — no default browser video chrome, no scrubber visible until playback starts.
- `muted autoplay loop playsinline` only if the section is designed for ambient looping; otherwise click-to-play with `preload="metadata"`.
- Respect `prefers-reduced-motion`: default to the poster frame with a visible play button, never autoplay, when that's set.
- Lazy-load (`loading="lazy"` equivalent / IntersectionObserver-gated `src`) since this section sits well below the fold.

## What NOT to do until this exists

No stock footage, no AI-generated UI mockup animation, no screen-recording of a different, unrelated product. Per this project's own standard: a missing product film is better than a fake one. Until this is captured, the homepage should keep using typography and the single real static screenshot to carry the "product in motion" beat, not a substitute.
