# Starlane product pruning report

This report covers the frontend repository on branch `claude/prune`, cut from the redesign head 950cd78. It has 10 commits. In short:

- 90 routes became 65.
- 17,705 lines were deleted.
- No backend code was changed, no schema was changed and no data was touched.
- Every removed route sends visitors to the page that now does its job, with a temporary (307) redirect. Old bookmarks and recent-page links keep working.

## The test applied

For each feature I asked: which Starlane loop does it serve, does the backend really support it, is anything else using it, and does Bridge, Scan, Watch, Simulate, Prepared, Missions or Memory already do the job?

- I removed a feature when the answer was "none", "a removed page", or "yes, another surface already does this".
- I kept a feature when it carries real decision evidence, even if it isn't one of the seven core surfaces.

## A. Feature inventory (after the pass)

| Class | Features |
|---|---|
| Core | Bridge, Scan (with history and conversation), Watch, Simulate, Prepared (with Decisions, the decision memo, proof and import), Missions, Memory |
| Supporting | Agents, Sources (with Connect and Tally), Control (Approvals, Decisions, Audit), Settings, Intelligence (outside signals and exposure), Outreach (the place where Missions send messages), Onboarding, Admin, Billing |
| Useful but secondary (records lenses, under More) | Collections, Customers, Invoices, Cash forecast, Inventory, Reports, Library, Suppliers, New invoice |
| Public | Landing page, /product/*, Login, Signup, Forgot password, Access, Download, Terms, Privacy, Security, /auth/desktop |
| Removed | See the graveyard below |

## B. Features removed (the graveyard)

| Feature | Old location | Why it existed | Usage at removal | Decision and reason | Backend impact | Replacement flow |
|---|---|---|---|---|---|---|
| AI Founder chat, auto-calling debtors, voice dictation | /ai-chat | The Vantro-era assistant: it called debtors in the owner's voice and sent bulk WhatsApp | Only a link from the old /dashboard | **Removed.** A second chat beside Scan, with outbound calls that bypass the approval gate | /api/ai-chat, /api/voice/call, /api/voice/config, /api/ai/call-script, /api/ai/bulk-whatsapp are now uncalled | Scan |
| AI voice training | /ai-train | Vocabulary and Twilio voice webhook setup for the calling bot | Only the feature-gating map | **Removed.** It only served voice calling | /api/vocabulary, /api/vocabulary/seed, /api/voice/webhook-url | None needed |
| Call analytics | /analytics | Charts of the bot's call logs | Only the old /dashboard | **Removed.** The calls it charted no longer happen | /api/calls/:userId list. Logging a call from Collections still uses /api/log-call | Reports |
| Team (workers plus Twilio voice webhook) | /team | Staff records for orders and attendance, and a Twilio form | None | **Removed.** Messages go from Starlane's verified number, so a per-user Twilio form is not needed. Users and roles live in Control | /api/workers, /api/settings/twilio | Control |
| QuickSale voice sale | Sheet inside /dashboard | Saying "10 bags cement 350" out loud to record a sale | Only the old dashboard | **Removed.** Speech-to-text data entry; the data now comes from your books | None | Sources |
| Message voice settings | Settings > Message voice | The owner's writing persona for AI messages | Read by the backend only in /api/ai-chat, the call script, bulk WhatsApp and the automation welcome note. All but the welcome note served features removed here | **Removed.** Daily reminders and Missions drafts don't read it. The owner's name stays editable under Profile | The voice_style and ai_persona columns stay (data is preserved) | None needed |
| Payment confetti | Overlay on every page | A full-screen "dopamine hit" when a payment landed. It polled every 30 seconds | Every page | **Removed.** Decoration, and an extra poll on every page | None | The payment push notification stays |
| Overview dashboard | /dashboard | The pre-Bridge home | Off the rail | **Removed.** It duplicated Bridge | /api/metrics, /api/analytics and control-room are now uncalled | Bridge |
| Today | /today | The daily orders and expenses home | Off the rail | **Removed.** It duplicated Bridge | /api/today/summary, /api/expenses, /api/os/today | Bridge |
| Business state | /business-state | The third "state of the business" page, built from 20 components | Off the rail | **Removed.** It duplicated Bridge | None unique | Bridge |
| Customer khata | /khata | A manual ledger book per customer | Linked from Customers | **Removed.** Manual bookkeeping; Starlane reads your books from Sources | /api/khata/entry writes and khata detail are uncalled. **/api/khata stays**, because Customers reads it | Customers |
| Sales and Purchases | /sales, /purchases | Manual entry, with camera bill scanning | Off the rail | **Removed.** Mini-ERP data entry | /api/sales and /api/purchases writes and scan. **The list endpoints stay**, because Inventory reads them | Sources |
| Bank monitor and bank ledger | /bank, /ledger | Manual bank books and statement OCR | Off the rail | **Removed.** Mini-ERP. Reconciliation is a Sources tab | /api/bank/*, /api/transactions/*, /api/ai-financial-monitor | Sources > Reconciliation |
| GST invoice scanner | /scanner | Photographing an invoice to create it | Off the rail | **Removed.** OCR data entry duplicating imports | /api/scan-document | Prepared > Import, Sources |
| Today's orders and Staff attendance | /orders, /attendance | Order desk and payroll | Off the rail | **Removed.** Misaligned with Starlane's loop | /api/orders, /api/attendance, /api/attendance/salary | None |
| CRM prospects | /crm | A sales pipeline | Off the rail | **Removed.** Misaligned; Starlane is not a CRM | /api/prospects | None |
| WhatsApp campaigns | /whatsapp | Bulk reminder blasts | Off the rail | **Removed.** Bulk sends bypass Prepared approval. Outreach through Missions does this with approval | None unique | Missions and Outreach |
| Auto follow-up | /dunning | Reminder rules | Off the rail | **Removed.** Settings > Reminder rules edits the same rules on the same API | None (Settings still uses /api/dunning) | Settings > Reminder rules |
| Starlane brain | /brain | Custom rules typed in for the AI | Off the rail | **Removed.** Generic assistant prompts. Memory holds what Starlane has learned | /api/ai/brain, /api/ai/brain/rules | Memory |
| Industry picker | /industry | An onboarding experiment | Nothing linked to it | **Removed.** Orphaned; Signup and Settings already ask for the business type | None | Settings > Business |
| Discover | /discover, /discover/[id] | An early findings feed | Linked from Library and Prepared | **Removed.** It read the same signal feed as Intelligence | None (the intelligence endpoints are still used) | Intelligence. Opportunities still reach you as Prepared cards, which now open Intelligence |
| Action center | /ai-actions | The first approvals inbox | Off the rail | **Removed.** Same queue as Control > Approvals | None | Prepared, Control > Approvals |
| Bad debt radar | /bad-debt | Flagged likely bad debts | Off the rail | **Removed.** These flags already arrive as Prepared actions | /api/bad-debt-flags is uncalled from the UI | Prepared |
| Supply chain actions | /supply-chain-actions | Executing supplier actions | Nothing linked to it | **Removed.** The same action record, with approve and run, is on the Intelligence signal page | None | Intelligence signal page |
| Demo mode | Banner on every page | A sample-data tour | Nothing could switch it on | **Removed.** Unreachable, and it showed fake data | None | None |
| Library Workflows tab | /library | Shortcuts to screens | Library | **Removed.** Every row opened a screen already on the sidebar | None | Sidebar, Ctrl+K |
| Billing social proof | /billing | Two five-star testimonials and an ROI strip ("₹3.8L", "200+ MSMEs", "3.2× more") | Billing | **Removed.** Invented quotes and figures | None | None; pricing and checkout are unchanged |
| atlas:check script | package.json | Checked a pack registry | Failed on every branch | **Removed.** It pointed at lib/atlas, which was deleted long ago | None | None |

## C. Features demoted from navigation

- **Scan history** leaves the More group. It's reachable from Scan and from the sidebar's recent conversations, and the Scan item stays lit while you're on it.
- **Supporting pages in Ctrl+K** shrink to four, labelled "Supporting page": Intelligence, Suppliers, New invoice and Billing.

## D. Features consolidated

- **Home and state pages:** four became one (Bridge, replacing Dashboard, Today and Business state).
- **Chats:** two became one (Scan).
- **Signal feeds:** two became one (Intelligence).
- **Approval inboxes:** four became two (Prepared, and Control > Approvals), replacing Action center and Bad debt radar.
- **Reminder-rule editors:** two became one (Settings).
- **Command palette:** two duplicate actions removed ("Open Watch" and "Simulate a scenario" repeated the page rows).

## E. AI Voice status

**Gone, every part of it:**
- Speech-to-text dictation (QuickSale and the AI Founder microphone), including the Web Speech helper.
- Voice calling, voice training and the Twilio voice webhook pages.
- Call analytics.
- The Message voice persona settings.
- The browser microphone permission.

Nothing voice-related is left in the app. It didn't earn its place: Scan and Ctrl+K do the job better, and calling customers bypassed approval.

## F. Legacy functionality found

These were Vantro-era MSME bookkeeping and operations tools, and all of them are covered in B:
- Khata, sales, purchases, bank, ledger, orders, attendance, team and CRM.
- Bulk WhatsApp campaigns and the GST OCR scanner.
- Brain rules.
- The calling bot and its persona, and demo mode.

## G. Duplicate functionality found

- Bridge was repeated by Dashboard, Today and Business state.
- Scan was repeated by AI Founder chat.
- Intelligence was repeated by Discover and Supply chain actions.
- Prepared and Control > Approvals were repeated by Action center and Bad debt radar.
- Settings > Reminder rules was repeated by Auto follow-up.
- The sidebar was repeated by the Library Workflows tab.

## H. Dependencies removed

- `react-hook-form`: zero imports.
- The pdf.js bundle in `public/pdfjs` (1.4 MB): only the bank ledger used it.

`react-icons` stays, because 9 live pages still import it.

## I. Permissions removed

The `Permissions-Policy` header now sends `camera=()` and `microphone=()`. Nothing in the app uses either. Before, both were allowed for the app's own origin, for the scanner and dictation.

## J. Routes removed

25 page routes:
- /ai-chat, /ai-train, /analytics, /team, /dashboard
- /attendance, /orders, /today, /khata, /sales, /purchases, /bank, /ledger, /scanner, /crm, /whatsapp, /dunning, /brain, /industry
- /discover, /discover/[id], /ai-actions, /supply-chain-actions, /bad-debt, /business-state

Each one redirects as shown in B, and they are gone from the middleware guard list.

## K. Components, hooks and styles removed

- **Files:** 39 orphaned files, including:
  - the business-state kit (20 files)
  - QuickSale, PaymentCelebration and the webSpeech helper
  - WelcomeGuide, TodaySummary, BridgePanels, ScanLookup and FeatureActionRow
  - OwnerBriefingCard and TodayDecisionsCard
  - unused UI kit pieces: Card, Input, Tooltip, Sparkline, Breadcrumb, PageHeader, RiskIndicator, StateIndicator and LoadingState
  - V32StubPage, PlatformAvailability, businessMode and demo
- **API client methods and their types:**
  - scanner, khata, attendance, prospects, workers, voice, transactions, world
  - briefing, owner briefing preview, priority, AI insights, metrics, metrics trend, analytics, control room
  - generateMessage, calls.list, and the sales and purchase writes and scans
  - the Twilio, WhatsApp-key and Razorpay-key saves
  - osApi today, knowledge and funnel; decisionsApi dataProfile; outreachApi campaigns and jobs; accessApi platforms
- **Icons and CSS:**
  - 6 unused icons, including IconMic.
  - 78 rules and 7 keyframes in globals.css for classes nothing uses.
  - 150 old marketing-page rules in atlas.css.

## L. Backend APIs marked for deprecation (nothing deleted)

The frontend no longer calls these. Before removing any of them, check for server-side callers: crons, webhooks, the desktop app, the mobile app and agents.

- **Voice and calling:** /api/voice/call, /api/voice/config, /api/voice/webhook-url, /api/ai/call-script, /api/vocabulary, /api/vocabulary/seed, /api/settings/twilio
  - Twilio may still post to an inbound voice webhook, so turn it off in the Twilio console first.
- **Old chat and AI:** /api/ai-chat (but **not yet**: Scan still calls it, see V), /api/ai/brain, /api/ai/brain/rules, /api/ai/bulk-whatsapp, /api/ml/briefing, /api/ai-insights, /api/generate-message, /api/calculate-priority
- **Bookkeeping:**
  - /api/khata/entry, /api/sales/scan, /api/purchases/scan
  - the write routes for /api/purchases/:id and /api/sales/:id
  - /api/bank/*, /api/transactions/*, /api/ai-financial-monitor
  - /api/scan-document, /api/expenses
- **Staff and CRM:** /api/workers, /api/attendance, /api/attendance/salary, /api/orders, /api/prospects
- **Old home pages:** /api/metrics, /api/analytics, /api/business/control-room, /api/today/summary, /api/os/today, /api/os/funnel, /api/os/knowledge (GET), /api/decisions/data-profile
- **Other:** /api/calls/:userId, /api/bad-debt-flags, /api/world/health, /api/settings/razorpay, /api/access/platforms, /api/agents/core.owner_briefing/preview

## M. Data and schema deliberately preserved

- No migration, no table drop and no column drop.
- Khata entries, sales, purchases, bank transactions, attendance, workers, prospects, brain rules, vocabulary, call logs, and the voice_style and ai_persona settings are all still stored.
- Customers still reads /api/khata, and Inventory still reads the sales and purchases lists.

## N. Navigation, before and after

| | Before | After |
|---|---|---|
| Surfaces | Bridge, Scan, Watch, Simulate, Prepared, Missions, Memory | Same |
| Workspace | Agents, Sources, Control, Audit, Settings | Same |
| More | Collections, Customers, Invoices, Cash forecast, Inventory, Reports, Library, History | Collections, Customers, Invoices, Cash forecast, Inventory, Reports, Library |
| Ctrl+K older pages | 22: Discover, Today, Business state, Overview, Suppliers, New invoice, Bank, Ledger, Bad debt, Khata, Sales, Purchases, Orders, Scanner, Attendance, Team, WhatsApp, Auto follow-up, Action center, Brain, Analytics, Billing | 4 supporting pages: Intelligence, Suppliers, New invoice, Billing |
| Ctrl+K actions | Ask, New watch, New mission, Simulate a scenario, Open Watch, Switch theme | Ask, New watch, New mission, Switch theme |

## O. Product mental model after cleanup

- **Bridge:** reality and state.
- **Scan:** discovery and investigation. Library holds its starting questions and the ones you saved.
- **Watch:** continuous monitoring.
- **Simulate:** options and consequences.
- **Prepared:** human attention and approvals, with the Decision memo behind it.
- **Missions:** execution, with Outreach as the way messages leave.
- **Memory:** learning and history.
- **Supporting:** Agents, Sources, Control (with Approvals and Audit) and Settings. Intelligence covers outside events and the exposure they create. The records lenses are under More.

## P–T. Checks

- **Lint:** 0 errors. One older warning remains, in /invoice/new. The other six older warnings were in pages removed here.
- **Typecheck:** pass.
- **Tests:** `test:auth-mode` passes 18 of 18. I re-ran it after each removal commit.
- **Security:**
  - `security:secrets` passes.
  - `security:auth-usage` passes, scanning 182 files (down from 255).
  - `security:audit-gate` passes.
- **Production build:** `next build` passes. Shared first-load JS is unchanged at 103 kB.

## U. Visual QA

In the preview, at 1440×900, with sample data:
- **Changed pages re-rendered:** Bridge, Scan, Library, Customers, Settings (Profile and Reminder rules), Billing, Collections, Intelligence, Prepared.
- **Pages using the trimmed atlas.css:** Login, Signup and Terms.
- **Redirects:** checked with curl. For example, /dashboard goes to /bridge, /khata to /customers, /discover/s1 to /intelligence/s1 and /dunning to Settings > Reminder rules.
- **Contact sheet:** `design-review/qa/pruned-sheet.png`.

## V. Remaining questionable features (your call)

1. **Collections.** It is the Vantro-era receivables page, but it is also where reminders and call logs happen today. Folding it into Watch, Prepared and the Collections agent would mean building new things, and this pass only subtracts. I kept it as a records lens.
2. **Cash forecast.** It is real intelligence: three scenarios plus the cash-out date. It could live inside Simulate, but that needs a small build.
3. **Invoices and New invoice.** GST invoice creation is ERP-like. It feeds Collections. I kept it.
4. **Billing.** The page still uses the pre-redesign hard-sell style and plan copy ("AI ranks who to call first", "Custom AI message voice"). The plan copy is a pricing decision for you. The page also has a hydration warning that existed before this pass.
5. **Scan still posts to /api/ai-chat.** That backend route still reads the old persona fields. A rename or cleanup on the backend is a separate change.
6. **"© Vantro Technologies"** in the public footer. If that is the legal entity's name, it should stay. Otherwise say so and I'll change it.
7. **Outreach** is reachable only from Missions, which seems right, but it is its own route.
