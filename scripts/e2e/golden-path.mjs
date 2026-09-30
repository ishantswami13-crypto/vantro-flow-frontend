// Browser end-to-end check of the Starlane golden path, against a running
// frontend + backend (e.g. local: backend on :8787 with a migrated Postgres,
// `next start` on :3000 built with NEXT_PUBLIC_API_URL=http://localhost:8787).
//
//   Flow A  visitor: landing -> Get Starlane -> 3 steps -> deterministic result -> status page
//   Admin   review queue -> approve -> one-time download link
//   Flow B  applicant: status shows approved -> setup page -> bridge download
//   Flow C  owner: Sources -> Connect Tally -> download bridge -> pairing code ->
//           run the exact command with the downloaded bridge -> paired device appears ->
//           first sync (the bridge's own parsed sample vouchers, since no TallyPrime
//           runs here) -> Sources shows Tally healthy with the device.
//
// Requires: playwright (npm i -D playwright, or run from a folder that has it),
// a Chromium (E2E_CHROMIUM or Playwright's default), and env:
//   E2E_APP=http://localhost:3000
//   E2E_ADMIN_TOKEN / E2E_ADMIN_ID / E2E_ADMIN_EMAIL   a user listed in ADMIN_EMAILS
//   E2E_OWNER_TOKEN / E2E_OWNER_ID / E2E_OWNER_EMAIL   an owner with no Tally connection yet
//   E2E_BRIDGE_SAMPLE=path/to/vantro-flow-backend/tally-connector/sample-daybook.xml
// Tokens are JWTs signed with the backend's JWT_SECRET ({ userId, email }).
// The backend's ACCESS_APPLY_LIMIT_PER_HOUR must allow the application.
import { chromium } from 'playwright';
import { readFileSync, mkdtempSync, copyFileSync, rmSync, readFileSync as rf } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const env = (k) => { const v = process.env[k]; if (!v) { console.error(`missing ${k}`); process.exit(2); } return v; };
const APP = process.env.E2E_APP || 'http://localhost:3000';
const ADMIN = { token: env('E2E_ADMIN_TOKEN'), user: { id: env('E2E_ADMIN_ID'), email: env('E2E_ADMIN_EMAIL'), business_name: 'Starlane admin' } };
const OWNER = { token: env('E2E_OWNER_TOKEN'), user: { id: env('E2E_OWNER_ID'), email: env('E2E_OWNER_EMAIL'), business_name: 'E2E owner' } };
const results = [];
const check = (n, c, d) => { results.push([c ? 'PASS' : 'FAIL', n, c ? '' : (d ?? '')]); console.log(c ? '  ✅' : '  ❌', n, c ? '' : (d ?? '')); };
const browser = await chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
const errs = [];
const ctxFor = async (token, user) => {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, ignoreHTTPSErrors: true, acceptDownloads: true });
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('vantro_cookie_consent', 'declined');
    if (t) { localStorage.setItem('vantro_token', t); localStorage.setItem('vantro_user', JSON.stringify(u)); }
  }, [token, user]);
  if (token) await ctx.addCookies([{ name: 'vantro_token', value: token, url: APP }]);
  return ctx;
};
const email = `asha+${Date.now()}@raodist.test`;

console.log('— Flow A: visitor applies');
const v = await (await ctxFor()).newPage();
v.on('pageerror', (e) => errs.push('visitor: ' + e.message));
await v.goto(APP + '/', { waitUntil: 'networkidle' });
await v.getByRole('link', { name: 'Get Starlane' }).first().click();
await v.waitForURL('**/access');
await v.getByRole('button', { name: 'Continue' }).click();
check('empty step shows field errors', await v.getByText('Name is required').isVisible());
await v.fill('#f-name', 'Asha Rao'); await v.fill('#f-email', email); await v.fill('#f-company', 'Rao Distributors');
await v.fill('#f-website', 'raodist.in'); await v.fill('#f-role', 'Owner'); await v.fill('#f-industry', 'Distribution');
await v.selectOption('#f-companySize', '11-50');
await v.getByRole('button', { name: 'Continue' }).click();
await v.getByText('TallyPrime').waitFor();
check('systems list loaded from the live catalog', await v.getByText('Not connectable yet').first().isVisible());
await v.getByLabel(/TallyPrime/).check(); await v.getByLabel(/Xero/).check();
await v.getByLabel('Yes, when onboarding starts').check();
if (process.env.E2E_SHOTS) await v.screenshot({ path: 'e2e-apply-systems.png', fullPage: true });
await v.getByRole('button', { name: 'Continue' }).click();
await v.fill('#f-problem', 'We never know which customers will actually pay this month, so supplier payments are guesswork.');
await v.fill('#f-desiredOutcome', 'Receivables over 30 days halved without losing key customers.');
await v.getByRole('button', { name: 'Submit application' }).click();
await v.getByText('Here is where you stand').waitFor({ timeout: 15000 });
check('result shows the deterministic assessment', await v.getByText('Ready for Starlane').isVisible());
check('result names the unsupported system', await v.getByText(/Not connectable yet: Xero/).isVisible());
if (process.env.E2E_SHOTS) await v.screenshot({ path: 'e2e-apply-result.png', fullPage: true });
await v.getByRole('link', { name: 'Open my status page' }).click();
await v.waitForURL('**/access/status#token=*');
await v.getByText('Rao Distributors').first().waitFor();
check('status page: submitted', await v.getByText('Submitted', { exact: true }).isVisible());
const statusUrl = v.url();

console.log('— Admin review');
const a = await (await ctxFor(ADMIN.token, ADMIN.user)).newPage();
a.on('pageerror', (e) => errs.push('admin: ' + e.message));
await a.goto(APP + '/admin/access', { waitUntil: 'networkidle' });
await a.getByRole('button', { name: 'Rao Distributors' }).first().click();
await a.getByText('Desired outcome (60 days)').waitFor();
await a.fill('#review-note', 'Welcome — onboarding call on Tuesday.');
await a.getByRole('button', { name: 'Approve', exact: true }).click();
await a.getByText(/Email is not configured/).waitFor({ timeout: 15000 });
const dlUrl = await a.locator('code').filter({ hasText: '/download#token=' }).innerText();
check('approve shows one-time download link (email not configured, said so)', /\/download#token=/.test(dlUrl));
if (process.env.E2E_SHOTS) await a.screenshot({ path: 'e2e-admin.png', fullPage: true });

console.log('— Flow B: approved applicant');
await v.goto(statusUrl); await v.reload({ waitUntil: 'networkidle' });
check('status page now approved with note', await v.getByText('Approved', { exact: true }).isVisible() && await v.getByText('Welcome — onboarding call').isVisible());
await v.goto(dlUrl, { waitUntil: 'networkidle' });
await v.getByText('Install the Starlane Tally bridge').waitFor();
check('no app download offered while no build is published', (await v.getByRole('button', { name: 'Download for Windows' }).count()) === 0 && (await v.getByText('Starlane on your other devices').count()) === 0);
const [dl] = await Promise.all([v.waitForEvent('download'), v.getByRole('button', { name: /Download tally-sync.mjs/ }).click()]);
const dlPath = await dl.path();
check('bridge downloaded from setup page', rf(dlPath, 'utf8').includes('Starlane Tally Connector'));
if (process.env.E2E_SHOTS) await v.screenshot({ path: 'e2e-download.png', fullPage: true });

console.log('— Flow C: owner connects Tally from Sources');
const o = await (await ctxFor(OWNER.token, OWNER.user)).newPage();
o.on('pageerror', (e) => errs.push('owner: ' + e.message));
await o.goto(APP + '/sources', { waitUntil: 'networkidle' });
await o.getByText('No company system is connected yet.').waitFor({ timeout: 15000 });
check('Sources: honest empty state before connecting', true);
await o.getByRole('button', { name: 'Available' }).click();
check('Sources › Available: Xero not available, no connect action', await o.getByText('Not built yet', { exact: true }).isVisible());
if (process.env.E2E_SHOTS) await o.screenshot({ path: 'e2e-sources-available.png', fullPage: true });
await o.goto(APP + '/sources/connect', { waitUntil: 'networkidle' });
const [bdl] = await Promise.all([o.waitForEvent('download'), o.getByRole('button', { name: 'Download tally-sync.mjs' }).click()]);
const bridgeFile = await bdl.path();
await o.getByText(/SHA-256/).waitFor();
await o.getByRole('button', { name: 'Get pairing code' }).click();
const cmd = await o.locator('code').filter({ hasText: '--enroll' }).innerText();
check('pairing command shown', /node tally-sync\.mjs --api http:\/\/localhost:8787 --enroll \S+/.test(cmd), cmd);
// Run the exact command with the downloaded file, in an empty folder.
const dir = mkdtempSync(join(tmpdir(), 'bridge-e2e-'));
copyFileSync(bridgeFile, join(dir, 'tally-sync.mjs'));
execFileSync(process.execPath, ['tally-sync.mjs', ...cmd.split(' ').slice(2), '--dry-run'], { cwd: dir, env: { ...process.env, COMPUTERNAME: 'RAO-SHOP-PC' } });
await o.getByText('Paired: RAO-SHOP-PC').waitFor({ timeout: 15000 });
check('UI shows the real paired device', true);
// No TallyPrime here, so send the bridge's own parsed sample vouchers with the stored credential.
copyFileSync(env('E2E_BRIDGE_SAMPLE'), join(dir, 'sample-daybook.xml'));
const cred = JSON.parse(readFileSync(join(dir, '.vantro-device-credentials.json'), 'utf8'));
const out = execFileSync(process.execPath, ['tally-sync.mjs', '--test'], { cwd: dir, encoding: 'utf8' });
const vouchers = JSON.parse(out.slice(out.indexOf('\n[') + 1, out.lastIndexOf('\n]') + 2));
const r = await fetch(`${cred.apiBase}/api/import/tally`, { method: 'POST', headers: { Authorization: `VantroDevice ${cred.deviceId}.${cred.deviceSecret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ vouchers }) });
check('bridge credential sync accepted', r.status === 200, r.status);
await o.getByText(/Received at/).waitFor({ timeout: 15000 });
check('UI shows first sync received', true);
if (process.env.E2E_SHOTS) await o.screenshot({ path: 'e2e-connect.png', fullPage: true });
await o.goto(APP + '/sources', { waitUntil: 'networkidle' });
await o.getByText(/Connected · last synced/).waitFor({ timeout: 15000 });
check('Sources › Connected shows Tally healthy with device', await o.getByText(/RAO-SHOP-PC/).isVisible());
if (process.env.E2E_SHOTS) await o.screenshot({ path: 'e2e-sources-connected.png', fullPage: true });
rmSync(dir, { recursive: true, force: true });

console.log('page errors:', errs);
await browser.close();
const failed = results.filter((x) => x[0] === 'FAIL').length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
