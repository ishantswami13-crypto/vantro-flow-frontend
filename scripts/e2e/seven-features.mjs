// Browser end-to-end check of the seven features on the web, against a
// running frontend + backend (backend on :8787 with a migrated test Postgres,
// `next start` on :3000 built with NEXT_PUBLIC_API_URL=http://localhost:8787).
//
//   sign in -> The Bridge -> Scan a customer -> Watch -> Missions (start one
//   from Scan, approve its first step, cancel it) ->
//   Simulate (move an assumption, the estimate changes) -> Memory -> Prepared,
//   and the sidebar lists exactly the seven features plus Sources and Settings.
//
// Signs in through the real login form, so no token is minted here. Needs:
//   E2E_APP=http://localhost:3000
//   E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD   a test owner with open invoices
//     (the desktop seed owner works: Mehta Hardware is overdue)
//   E2E_SCAN_QUERY  (default "Mehta")      a customer name in that owner's books
// Optional: E2E_CHROMIUM (browser path), E2E_SHOTS=dir for screenshots.
import { chromium } from 'playwright';
const env = (k) => { const v = process.env[k]; if (!v) { console.error(`missing ${k}`); process.exit(2); } return v; };
const APP = process.env.E2E_APP || 'http://localhost:3000';
const EMAIL = env('E2E_OWNER_EMAIL'), PASSWORD = env('E2E_OWNER_PASSWORD');
const QUERY = process.env.E2E_SCAN_QUERY || 'Mehta';
const SHOTS = process.env.E2E_SHOTS;
const results = [];
const check = (n, c, d) => { results.push([c ? 'PASS' : 'FAIL', n]); console.log(c ? '  ✅' : '  ❌', n, c ? '' : (d ?? '')); };
const errs = [];

const browser = await chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('vantro_cookie_consent', 'declined'));
const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(`${p.url()}: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error' && /hydrat|Minified React error/i.test(m.text())) errs.push(`${p.url()}: ${m.text()}`); });
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/web-${name}.png`, fullPage: true }); };
const h1 = async (text) => { try { await p.getByRole('heading', { level: 1, name: text, exact: typeof text === 'string' }).first().waitFor({ timeout: 15000 }); return true; } catch { return false; } };
// Next's own route announcer also has role=alert; only the page's alerts count.
const noAlert = async () => (await p.locator('[role=alert]:not(#__next-route-announcer__)').count()) === 0;

try {
  console.log('— Sign in');
  await p.goto(APP + '/login', { waitUntil: 'networkidle' });
  await p.fill('#email', EMAIL);
  await p.locator('button[type=submit]').click();
  await p.fill('#password', PASSWORD);
  await p.locator('button[type=submit]').click();
  await p.waitForURL('**/bridge', { timeout: 20000 });
  check('login lands on The Bridge', true);

  console.log('— The Bridge');
  const bridgeH1 = p.getByRole('heading', { level: 1 }).first();
  await bridgeH1.waitFor({ timeout: 15000 });
  await p.waitForFunction(() => /You are owed|no books/.test(document.querySelector('h1')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const sentence = (await bridgeH1.textContent()) || '';
  check('Bridge headline is a sentence from the books', /You are owed ₹/.test(sentence), sentence);
  check('Bridge shows no load error', await noAlert());
  await shot('bridge');

  console.log('— Sidebar');
  const nav = await p.locator('nav a, aside a').allTextContents();
  const labels = nav.map((t) => t.trim()).filter(Boolean);
  for (const f of ['Bridge', 'Scan', 'Watch', 'Missions', 'Simulate', 'Memory', 'Prepared', 'Sources', 'Settings']) {
    check(`sidebar has ${f}`, labels.some((l) => l.includes(f)), labels.join(' | '));
  }
  for (const gone of ['Decisions', 'Inbox', 'Discover', 'Owner Briefing', 'Collections']) {
    check(`sidebar has no ${gone}`, !labels.some((l) => l.includes(gone)));
  }

  console.log('— Scan');
  await p.goto(APP + '/scan', { waitUntil: 'networkidle' });
  check('Scan heading', await h1('Scan'));
  await p.getByLabel('Customer or invoice number').fill(QUERY);
  const hit = p.locator('section[aria-labelledby="scan-lookup-h"] button').first();
  await hit.waitFor({ timeout: 10000 });
  await hit.click();
  await p.getByText(/overdue|Owes|owed/i).first().waitFor({ timeout: 10000 });
  check(`Scan opens ${QUERY} with what they owe`, await p.getByText(new RegExp(QUERY, 'i')).first().isVisible());
  check('Scan shows no error', await noAlert());
  await shot('scan');

  console.log('— Watch');
  await p.goto(APP + '/watch', { waitUntil: 'networkidle' });
  check('Watch heading', await h1(/Watch/));
  await p.locator('#watch-events-h').waitFor({ timeout: 10000 });
  check('Watch lists what it raised', await p.locator('#watch-events-h').isVisible());
  check('Watch shows no error', await noAlert());
  await shot('watch');
  const firstEvent = p.locator('section[aria-labelledby="watch-events-h"] button[aria-expanded]').first();
  if (await firstEvent.count()) {
    await firstEvent.click();
    const why = p.getByRole('link', { name: 'Why — open in Scan' }).first();
    if (await why.isVisible()) {
      check('an overdue invoice in Watch offers a mission', await p.getByRole('link', { name: /Start a mission to collect|Open its mission/ }).first().isVisible());
      await why.click();
      await p.waitForURL('**/scan?invoice=*');
      await p.getByText(/overdue/i).first().waitFor({ timeout: 10000 });
      check('Watch opens the invoice in Scan with the explanation', await p.getByRole('link', { name: /Start a mission to collect/ }).first().isVisible());
    }
  }

  console.log('— Missions');
  await p.goto(APP + '/missions', { waitUntil: 'networkidle' });
  check('Missions heading', await h1('Missions'));
  check('Missions shows no error', await noAlert());
  await shot('missions');

  console.log('— Start a mission from Scan, approve its first step');
  await p.goto(APP + '/scan', { waitUntil: 'networkidle' });
  await p.getByLabel('Customer or invoice number').fill(QUERY);
  await p.locator('section[aria-labelledby="scan-lookup-h"] button').first().click();
  await p.getByRole('link', { name: /Start a mission to collect/ }).click();
  await p.waitForURL('**/missions/new?**');
  await p.getByRole('heading', { level: 2, name: 'Objective' }).waitFor({ timeout: 15000 });
  check('new mission previews its objective from the books', await p.getByText(new RegExp(QUERY, 'i')).first().isVisible());
  const start = p.getByRole('button', { name: 'Start mission' });
  await p.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Start mission'); return b && !b.disabled; }, null, { timeout: 15000 });
  await shot('mission-new');
  await start.click();
  await p.waitForURL(/\/missions\/[0-9a-f-]{36}$/, { timeout: 15000 });
  await p.getByText('Active', { exact: true }).first().waitFor({ timeout: 15000 });
  check('starting a mission opens it as Active', true);
  const approve = p.getByRole('button', { name: 'Approve' }).first();
  const proposed = await approve.waitFor({ timeout: 15000 }).then(() => true, () => false);
  check('starting proposes a step for approval', proposed);
  if (proposed) {
    const confirmBox = p.getByLabel('I have checked this high-risk action').first();
    if (await confirmBox.isVisible()) await confirmBox.check();
    await approve.click();
    await p.getByRole('status').filter({ hasText: /Recorded|Approved|nothing went/i }).first().waitFor({ timeout: 15000 });
    check('approving records the decision and says nothing was sent', await p.getByText(/nothing went to|Sending messages is switched off/i).first().isVisible());
  }
  await shot('mission');
  await p.getByRole('button', { name: 'Cancel mission' }).click();
  await p.getByText('Cancelled', { exact: true }).first().waitFor({ timeout: 15000 });
  check('the mission can be cancelled (keeps this check re-runnable)', true);

  console.log('— Simulate');
  await p.goto(APP + '/simulate', { waitUntil: 'networkidle' });
  check('Simulate heading', await h1('Simulate'));
  const estimate = p.locator('h2:has-text("Estimate") + div');
  await estimate.waitFor({ timeout: 15000 });
  const before = (await estimate.textContent()) || '';
  const slider = p.getByLabel(/Assumed rate for/).first();
  await slider.focus();
  for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowLeft');
  await p.waitForFunction((b) => document.querySelector('h2 + div')?.textContent !== b, before, { timeout: 10000 }).catch(() => {});
  const after = (await estimate.textContent()) || '';
  check('lowering an assumption changes the estimate', before !== after, before);
  check('the changed assumption is marked as set by you', await p.getByText('Set by you').first().isVisible());
  check('Simulate shows no error', await noAlert());
  await shot('simulate');

  console.log('— Memory');
  await p.goto(APP + '/memory', { waitUntil: 'networkidle' });
  check('Memory heading', await h1('Memory'));
  await p.getByRole('tab', { name: 'Remembered' }).waitFor();
  check('Memory loaded (records or an honest empty state)', !(await p.getByText('Loading…').isVisible()));
  check('Memory shows no error', await noAlert());
  await shot('memory');

  console.log('— Prepared');
  await p.goto(APP + '/prepared', { waitUntil: 'networkidle' });
  check('Prepared heading', await h1('Prepared'));
  await p.locator('section[aria-labelledby^="h-"]').first().waitFor({ timeout: 10000 });
  check('Prepared shows the three horizons', (await p.locator('section[aria-labelledby^="h-"]').count()) === 3);
  check('Prepared shows no error', await noAlert());
  await shot('prepared');
} catch (e) {
  check('flow completed', false, e.message.split('\n')[0]);
} finally {
  check('no page errors or hydration errors', errs.length === 0, errs.slice(0, 3).join(' || '));
  await browser.close();
}
const failed = results.filter((r) => r[0] === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
