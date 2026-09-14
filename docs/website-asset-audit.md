# Starlane public website — asset audit

Categories: **A** production-ready · **B** usable with better crop/treatment · **C** needs replacement · **D** missing entirely.

## Product imagery

| Asset | Path | Category | Notes |
|---|---|---|---|
| Intelligence impact capture | `public/product/intelligence-impact-2xa.png` | **A** | Real, sanitized screenshot of the actual `/intelligence/[signalId]` route (2xA demo tenant). Currently used in `ProductReveal.tsx` via `next/image`, correctly labeled "Simulated demonstration · Read-only" in both the on-screen heading and the figcaption. This is the single strongest asset on the page — it is real product, not a redrawn mockup. |

No other real product screenshots exist yet (business-state view, decision/approval view, execution timeline, evidence drawer are not captured as standalone images).

## Video

| Asset | Path | Category | Notes |
|---|---|---|---|
| `hero-bg.mp4` | `public/hero-bg.mp4` | **D** (for product use) | Pre-existing generic background loop from the earlier dark "cortex canvas" landing page design, referenced only in a stale CSS comment in `globals.css` — not wired into the current page, and not a capture of the real product. Per the explicit rule against synthesizing fake product footage, this must **not** be repurposed as if it were product video. It should be deleted once confirmed unused elsewhere, or kept only if a future ambient/abstract background treatment is deliberately designed around it. |

No real product screen recordings, customer footage, or operator interviews exist in the repository.

## Photography

No business, operator, founder, warehouse/logistics, or customer photography exists anywhere in the repository (`public/` contains only branding marks, icons, and the one product screenshot above). Per the explicit instruction against stock photography, **no photography section has been built** — better to have no human-imagery section than a fake one. See the shot list for what would be needed.

## Logos / trust marks

No verified customer, pilot, or design-partner logos exist. No integration-partner logos are confirmed live. The current page correctly avoids fabricating a trust-logo strip and uses a plain textual credibility statement instead (in the proof/facts section between the hero product reveal and the reasoning-chain section).

## Fonts

`Playfair Display` (serif, display) and `Space Grotesk` (sans, UI/body) — both already loaded by `app/globals.css`'s existing `@import`, no new network requests introduced for the marketing site.

## Summary

The site's single load-bearing visual asset is the real intelligence-impact screenshot, and it is used correctly and honestly. Everything else — video, photography, trust logos — is either absent or explicitly excluded rather than faked, per the site's own stated principle of never inventing proof. See `docs/website-media-shot-list.md` for exactly what to capture next.
