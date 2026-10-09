# Starlane — product pruning report

Branch `claude/prune-surface`, cut from `claude/master-completion-9v0ftd` (the redesign).
Rule applied to every surface: *if we remove this, does Starlane get worse at helping an
organization understand, decide, act and learn?* If not, it goes.

Removal happens in phases. **Phase A (this branch):** retired routes redirect to the surface
that now does their job (Next.js applies `redirects()` before page routes, so the old pages
are unreachable), navigation, links, permissions and dependencies are cleaned. **Phase B
(awaiting owner approval):** delete the retired files listed below. No backend code or data
is touched in either phase.

## Product after cleanup

```
Starlane
├─ Bridge     reality connection + organizational state
├─ Scan       discovery + investigation      (Library, History are Scan's own pages)
├─ Watch      continuous monitoring          (Intelligence = external signals feeding Watch)
├─ Simulate   options + consequences
├─ Prepared   human attention + approvals    (Decisions are Prepared's detail pages)
├─ Missions   execution + coordination
└─ Memory     learning + organizational history
Operate: Agents · Sources · Control · Audit · Settings
Records (Ctrl+K only, not on the rail): Collections, Customers, Invoices, Cash forecast,
Inventory, Reports, and the bookkeeping pages listed under "Kept, demoted".
```

## A. Inventory (every route)

| Route | Class | Decision |
|---|---|---|
| bridge, scan, watch, simulate, prepared, missions, memory | Core | Keep |
| agents, sources, control, control/audit, control/approvals, settings | Supporting | Keep |
| decisions (+ /[id], /import) | Supporting (Prepared detail, file import) | Keep |
| intelligence (+ /[signalId]) | Supporting: external-world signals with exposure and evidence | Keep, role made explicit |
| library, scan/history | Supporting (Scan's saved/recent work) | Keep |
| collections, customers, suppliers, bills, invoice/*, inventory, forecast, reports | Useful but secondary: entity/finance lenses that evidence decisions | Keep, off the rail |
| today, sales, purchases, khata, bank, ledger, orders, scanner, whatsapp, dunning, bad-debt, team, billing, outreach, supply-chain-actions | Legacy MSME bookkeeping / operations | Kept, demoted (see below) |
| login, signup, forgot-password, onboarding, auth/desktop, access, download, privacy, security, terms, product/*, landing | Account / marketing | Keep |
| approvals, connections | Redirect stubs to /control/approvals and /sources | Keep (bookmark safety) |
| admin | Internal | Keep |
| **ai-chat, brain, ai-train, ai-actions, dashboard, business-state, discover, industry, crm, analytics, attendance** | Duplicate / gimmick / legacy / misaligned | **Retired** |

## B. Features retired

| Feature | Old location | Why it existed | Current usage | Decision and reason | Replacement flow |
|---|---|---|---|---|---|
| AI Founder (chat + voice input + "Call Center" auto-calling debtors in the owner's voice + daily briefing) | /ai-chat | Vantro-era "AI assistant" | Linked only from Overview | **Removed.** Duplicates Scan (same `/api/ai-chat` engine), voice input is a gimmick next to the command palette, and autonomous outbound calls bypass Prepared/approval. | Scan (`/ai-chat?q=` → `/scan`) |
| Starlane Brain (Hinglish chat + "teach the AI" rules) | /brain | Teach the assistant business rules | Not linked from any core surface | **Removed.** A second generic chat; rule teaching belongs to Memory corrections. Rows in the rules table are preserved. | Memory |
| AI Training (Twilio voice webhook, vocabulary) | /ai-train | Voice calling setup | Settings link only | **Removed.** Exists only to serve AI voice calling. | Settings |
| Action Center | /ai-actions | Card list of AI actions | Off the rail | **Removed.** Same `/api/ai-actions` data as Prepared and Control → Approvals; three inboxes for one thing. | Prepared, Control → Approvals |
| Overview | /dashboard | Old home page | Off the rail | **Removed.** A KPI wall duplicating Bridge; its ask box sent people to the retired AI Founder; carried the voice QuickSale button. | Bridge |
| Business state | /business-state | Old state page with drawers | Off the rail | **Removed.** Duplicates Bridge's business state; 20 bespoke components. | Bridge |
| Discover | /discover, /discover/[id] | Findings list | Library and Prepared linked to it | **Removed.** Reads the same signals feed as Intelligence. Links repointed. | Intelligence (`/discover/:id` → `/intelligence/:id`) |
| Industry picker | /industry | Onboarding-era business-type chooser + WhatsApp templates | No inbound links | **Removed.** Orphaned. | Settings |
| CRM (prospects pipeline) | /crm | Sales prospect tracking | Feature-gating only | **Removed.** A mini-CRM outside Starlane's loop. Prospect rows preserved. | Customers |
| Analytics | /analytics | Collections/calls charts | Off the rail | **Removed.** Overlaps Reports, Forecast and Watch objectives. | Reports |
| Staff attendance + salary | /attendance | Field-staff HR | Off the rail | **Removed.** HR, not organizational decision-making. Rows preserved. | — |
| QuickSale floating button with voice entry | Overview | Speak a sale | Overview only | **Removed** with Overview. Sales are entered in Sales or arrive from Tally. | Sales / Tally |
| Payment confetti | every page (layout) | Celebrate a payment | Always on | **Removed** from the layout. Decoration, not information. | Bridge "What changed" |
| Fabricated testimonials ("Vikram Mehta", "Priya Sharma", five stars) | Billing | Social proof | Shown to every paying user | **Removed.** Invented customers inside the product. | — |

## C. Demoted from navigation

Already off the rail in the redesign; this pass also removes the retired pages from the
command palette list (`lib/navigation.ts OTHER_PAGES`) and from feature gating.

## E. AI Voice — removed

Everything that listened or spoke is retired: `/ai-chat` voice input and Call Center,
`/ai-train`, the QuickSale microphone, `lib/webSpeech.ts`. The browser
`Permissions-Policy` now denies the microphone (`microphone=()`); camera stays for the bill
scanner. The Settings tab "Message voice" is **kept**: it is the writing tone for reminder
drafts (owner name, style, persona), not audio.

## F/G. Legacy and duplication found

- Three inboxes (Prepared, Control → Approvals, Action Center) → two, with distinct jobs.
- Three home/state pages (Bridge, Overview, Business state) → one.
- Two signal feeds (Intelligence, Discover) → one.
- Three chats (Scan, AI Founder, Brain) → one.
- Dead script: `npm run atlas:check` imports `lib/atlas/atlasProofModel.js`, which no longer exists (fails on the base branch too).
- Old brand: the marketing footer says "© Vantro Technologies" — left as the legal entity name; confirm.

## H. Dependencies removed

- `react-hook-form` (zero imports anywhere). `package.json` and lockfile updated.

## I. Permissions removed

- `Permissions-Policy: microphone=(self)` → `microphone=()`.

## J. Routes removed

`/ai-chat /brain /ai-train /ai-actions /dashboard /business-state /discover /discover/[id] /industry /crm /analytics /attendance` — each redirects (temporary, 307) to its replacement in `next.config.js`.
`middleware.ts` protected list cleaned of retired and long-gone routes (`/neural-engine /network /my-id /disputes /referrals /ca-portal /payment-plans`).

## K. Code to delete — Phase B (awaiting approval)

Retired route folders (14 files): `app/ai-chat app/ai-train app/brain app/ai-actions app/dashboard app/business-state app/discover app/industry app/crm app/analytics app/attendance`.

Orphaned by retirement or already unused (40 files, found with an import graph):

```
components/PaymentCelebration.tsx  components/QuickSale.tsx  components/WelcomeGuide.tsx
components/agents/OwnerBriefingCard.tsx  components/business-state/* (20 files)
components/features/FeatureActionRow.tsx  components/features/ScanLookup.tsx
components/layout/V32StubPage.tsx  components/marketing/PlatformAvailability.tsx
components/os/BridgePanels.tsx  components/scan/ScanMark.tsx
components/ui/{Breadcrumb,Card,Input,LoadingState,PageHeader,RiskIndicator,Sparkline,StateIndicator,Tooltip}.tsx
lib/businessMode.ts  lib/webSpeech.ts
```

API client methods with no live caller, to remove in the same commit: `api.prospects`,
`api.attendance`, `api.analytics`, `api.briefing`, `api.ownerBriefingPreview`,
`api.calls.list`, `api.metrics`.

## L. Backend APIs marked for deprecation (not removed)

| API | Live frontend caller after pruning | Note |
|---|---|---|
| `/api/voice/*` (call, config, webhook-url) | Team page still reads the webhook URL | Deprecate with AI calling; Team's Twilio form may also feed WhatsApp — confirm before removing |
| `/api/vocabulary` | none | Deprecate |
| `/api/ai/brain` | none | Deprecate |
| `/api/prospects` | none | Deprecate |
| `/api/attendance` | none | Deprecate |
| `/api/analytics/:id` | none | Deprecate |
| `/api/calls` (list) | none (`/api/calls` log is still used by Collections) | Keep the log, deprecate the list |
| `/api/ml/briefing` | none | Check desktop/mobile/cron before removing |

## M. Data deliberately preserved

No migration, no table drop. Prospects, attendance, workers, brain rules, vocabulary,
call logs and briefings stay in the database.

## V. Remaining questionable features (left in place, need an owner decision)

- **Team + Orders** — field-staff workers and "orders via AI call". Built for the AI-calling
  product; Team also holds the only Twilio credential form (may power WhatsApp).
- **Today, Sales, Purchases, Khata, Bank, Ledger** — manual bookkeeping. Useful for owners
  without Tally, but it is ERP data entry rather than decision intelligence.
- **WhatsApp, Auto follow-up (dunning), Outreach** — overlapping outbound messaging surfaces;
  should become Mission actions under Prepared approval.
- **Bad debt radar** — a list that Watch + Prepared already raise as decisions.
- **Supply-chain actions** — a real execution ledger with no inbound link; belongs under
  Control → Audit.
- **Collections** — should become a lens; reminders belong to Missions.
