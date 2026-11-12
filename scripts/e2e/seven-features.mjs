// Browser end-to-end check of the signed-in product, against a running
// frontend + backend (backend on :8787 with a migrated test Postgres,
// `next start` on :3000 built with NEXT_PUBLIC_API_URL=http://localhost:8787).
//
//   sign in -> Home -> sidebar -> Agents (give the Scan agent work, it completes)
//   -> Decisions (open one, Handle it, recorded in shadow mode)
//   -> Tasks (start one, approve its first step, cancel it)
//   -> Scenarios (run a what-if) -> Monitors -> Approvals -> Ask Starlane
//   -> every app page loads with no error.
//
// Signs in through the real login form, so no token is minted here. Needs:
//   E2E_APP=http://localhost:3000
//   E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD   a test owner with an imported ledger
//     that has overdue invoices (the pilot fixture ledger works)
// Optional: E2E_CHROMIUM (browser path), E2E_SHOTS=dir for screenshots.
// Nothing here can send a message: the backend's external sending stays off.
import { chromium } from 'playwright';
const env = (k) => { const v = process.env[k]; if (!v) { console.error(`missing ${k}`); process.exit(2); } return v; };
const APP = process.env.E2E_APP || 'http://localhost:3000';
const EMAIL = env('E2E_OWNER_EMAIL'), PASSWORD = env('E2E_OWNER_PASSWORD');
const SHOTS = process.env.E2E_SHOTS;
const results = [];
const check = (n, c, d) => { results.push([c ? 'PASS' : 'FAIL', n]); console.log(c ? '  ✅' : '  ❌', n, c ? '' : (d ?? '')); };
const errs = [];
const serverErrors = [];

const browser = await chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('vantro_cookie_consent', 'declined'));
const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(`${p.url()}: ${e.message}`));
p.on('response', (r) => { if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };
const go = async (path) => {
  await p.goto(APP + path, { waitUntil: 'load' });
  await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
};
const h1 = async (name) => p.getByRole('heading', { level: 1, name }).first().isVisible();
const BROKEN = /something went wrong|failed to load|couldn.t load|internal server error|application error|\bNaN\b|\bundefined\b|\[object Object\]|Invalid Date/;
const looksBroken = async () => BROKEN.test(await p.locator('body').innerText());

try {
  console.log('— Sign in');
  // networkidle, not load: typing before React hydrates leaves Continue disabled.
  await p.goto(APP + '/login', { waitUntil: 'networkidle' });
  await p.fill('#email', EMAIL);
  await p.locator('button[type=submit]').click();
  await p.fill('#password', PASSWORD);
  await p.locator('button[type=submit]').click();
  await p.waitForURL('**/bridge', { timeout: 20000 });
  check('login lands on Home', true);

  console.log('— Home');
  await p.getByPlaceholder(/Ask Starlane/i).waitFor({ timeout: 15000 });
  check('Home shows the question box', true);
  check('Home shows no error', !(await looksBroken()));
  await shot('home');

  console.log('— Sidebar');
  const labels = (await p.locator('nav a, aside a').allTextContents()).map((t) => t.trim()).filter(Boolean);
  for (const f of ['Agents', 'Vault', 'Command Center', 'Receivables Review', 'Decisions', 'Approvals', 'Monitors', 'Bank matching', 'Supplier run', 'Data sources']) {
    check(`sidebar has ${f}`, labels.some((l) => l.includes(f)), labels.join(' | '));
  }

  console.log('— Agents');
  await go('/agents');
  check('Agents heading', await h1('Agents'));
  await p.getByPlaceholder(/Give the scan work/i).fill('Scan my ledger and find the bottleneck from invoice to payment');
  await p.getByRole('button', { name: /Start agent/i }).click();
  await p.waitForURL(/\/agents\/[^/]+\/run\/[0-9a-f-]{36}/, { timeout: 20000 });
  await p.getByText('Completed').first().waitFor({ timeout: 60000 });
  check('the Scan agent runs to Completed', true);
  await shot('agent-run');

  console.log('— Decisions');
  await go('/decisions');
  check('Decisions heading', await h1('Decisions'));
  const decision = p.locator('a[href^="/decisions/"]').filter({ hasText: /\?/ }).first();
  await decision.waitFor({ timeout: 15000 });
  await decision.click();
  await p.waitForURL(/\/decisions\/[0-9a-f-]{36}/);
  await p.waitForLoadState('networkidle').catch(() => {});
  check('a decision shows its bottom line and evidence', await p.getByText(/Bottom line/).first().waitFor({ timeout: 10000 }).then(() => true, () => false));
  // Once handled (an earlier run of this check) a decision no longer offers Choose / Handle it.
  const handle = p.getByRole('button', { name: 'Handle it' });
  if (await handle.isVisible()) {
    await handle.click();
    await p.getByText(/Recorded in shadow mode/i).first().waitFor({ timeout: 15000 });
    check('Handle it records the choice in shadow mode (nothing sent)', true);
  }
  check('decision page shows no error', !(await looksBroken()));
  await shot('decision');

  console.log('— Tasks: start one, approve its first step, cancel it');
  await go('/missions/new');
  await p.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Start task'); return b && !b.disabled; }, null, { timeout: 15000 });
  await p.getByRole('button', { name: 'Start task' }).click();
  await p.waitForURL(/\/missions\/[0-9a-f-]{36}/, { timeout: 15000 });
  await p.getByText('Active', { exact: true }).first().waitFor({ timeout: 15000 });
  check('starting a task opens it as Active', true);
  const approve = p.getByRole('button', { name: 'Approve' }).first();
  if (await approve.waitFor({ timeout: 10000 }).then(() => true, () => false)) {
    const confirmBox = p.getByLabel(/I have checked/).first();
    if (await confirmBox.isVisible().catch(() => false)) await confirmBox.check();
    await approve.click();
    await p.waitForTimeout(2000);
    check('approving the first step shows no error', !(await looksBroken()));
  }
  await shot('task');
  const cancel = p.getByRole('button', { name: /Cancel/ }).first();
  p.once('dialog', (d) => d.accept());
  await cancel.click();
  await p.getByText('Cancelled', { exact: true }).first().waitFor({ timeout: 15000 });
  check('the task can be cancelled (keeps this check re-runnable)', true);

  console.log('— Scenarios');
  await go('/simulate');
  check('Scenarios heading', await h1('Scenarios'));
  await p.getByRole('button', { name: /Run simulation/i }).click();
  await p.getByText(/Projected overdue/i).first().waitFor({ timeout: 15000 });
  check('a what-if shows its downstream effects', true);
  await shot('scenarios');

  console.log('— Ask Starlane');
  await go('/bridge');
  await p.getByPlaceholder(/Ask Starlane/i).fill('Who owes us the most right now?');
  await p.keyboard.press('Enter');
  await p.waitForURL(/\/scan\/[0-9a-f-]{36}/, { timeout: 20000 });
  await p.getByText(/owes you the most/i).first().waitFor({ timeout: 30000 });
  check('a question is answered from the books', true);
  await shot('answer');

  console.log('— Every app page loads');
  for (const [path, heading] of [['/command', /Command Center/], ['/review', 'Receivables Review'], ['/prepared', 'Approvals'], ['/watch', 'Monitors'], ['/reconcile', 'Bank matching'], ['/payables', 'Supplier run'], ['/sources', 'Data sources'], ['/library', 'Vault'], ['/missions', 'Tasks'], ['/workflows', 'Workflows'], ['/memory', 'Memory'], ['/control', 'Control'], ['/discover', 'Discover'], ['/spaces', 'Spaces'], ['/settings', 'Settings']]) {
    await go(path);
    check(`${path} loads with its heading and no error`, (await h1(heading)) && !(await looksBroken()), p.url());
  }
} catch (e) {
  check('flow completed', false, e.message.split('\n')[0]);
} finally {
  check('no page errors or hydration errors', errs.length === 0, errs.slice(0, 3).join(' || '));
  check('no 5xx responses', serverErrors.length === 0, serverErrors.slice(0, 3).join(' || '));
  await browser.close();
}
const failed = results.filter((r) => r[0] === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
