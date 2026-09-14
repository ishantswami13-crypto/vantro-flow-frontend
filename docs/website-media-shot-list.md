# Starlane public website — media shot list

None of the shots below exist yet. This is what to capture next, in priority order, to move the homepage from "typography + one real screenshot" to the fuller product-in-motion experience the site's design direction calls for.

---

### SHOT 01 — Signal detection → impact reveal
- **Duration:** 10–15s
- **Aspect:** 16:9, capture at 2560×1440 minimum (site displays large, needs headroom for crop)
- **Motion:** Screen recording, real interaction — no synthetic animation
- **UI state:** `/intelligence` list → click into a signal → scroll through the causal chain (Event → Supplier → Component → Inventory → Products → Orders → Revenue)
- **Crop:** Full browser chrome removed; keep the "Simulated demonstration" label always in frame
- **Poster frame:** The revenue-exposure metric card, fully revealed
- **Mobile alternative:** Static crop of the same screenshot already in `public/product/`, no separate mobile video needed at this stage

### SHOT 02 — Evidence drawer interaction
- **Duration:** 8–12s
- **Aspect:** 16:9 or 4:5 (drawer is a right-side panel — 4:5 may crop better)
- **Motion:** Click "View evidence," scroll through Observed/Calculated/Assumption/Forecast groups
- **UI state:** `EvidenceDrawer.tsx` open over the impact view
- **Crop:** Tight on the drawer itself
- **Poster frame:** The confidence-badge row, showing at least two different evidence-kind badges
- **Mobile alternative:** Static screenshot of the drawer at mobile width

### SHOT 03 — Forecast and decision comparison
- **Duration:** 10–15s
- **Aspect:** 16:9
- **Motion:** Scroll from the forecast timeline into the Without-action / With-action comparison
- **UI state:** `ForecastTimeline.tsx` + `DecisionSection.tsx`
- **Crop:** Wide enough to show both comparison columns side by side
- **Poster frame:** The comparison card, both columns visible
- **Mobile alternative:** Two stacked static crops (without / with)

### SHOT 04 — Approval → execution → verification
- **Duration:** 10–20s
- **Aspect:** 16:9
- **Motion:** Click "Approve & execute," show the real execution result card, then the "Outcome verification" section's "Check now" real response
- **UI state:** `DecisionSection.tsx` execution result + `OutcomeVerification.tsx`
- **Crop:** Full width of the result card
- **Poster frame:** The "Executed via Demo ERP Adapter" success state — this is the moment that proves the loop closes for real
- **Mobile alternative:** Static crop of the execution result card

### SHOT 05 — Operator/customer interview footage
- **Not yet applicable.** Starlane has no design partners or pilot customers who have agreed to be photographed, filmed, or quoted. Do not schedule this shot until a real relationship and explicit consent exist. When one does: 30–60s, documentary style, natural light, real workplace (warehouse/office/operations floor), no stock-photo styling.

---

## What NOT to do in the meantime

Per the site's own zero-fabrication principle: do not fill these slots with generic stock footage, synthetic UI mockups, or a repurposed unrelated video (`public/hero-bg.mp4` specifically should not be used here — see `docs/website-asset-audit.md`). An absent section, clearly scoped here, is more credible than a fake one.
