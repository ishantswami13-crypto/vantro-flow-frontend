"""Desktop golden flow in a browser preview of the app's web view:

sign in -> connect Tally -> first sync -> The Bridge -> Watch an overdue invoice
-> Scan why -> start a collections Mission -> Simulate it -> approve the
mission's reminder -> the customer pays (in the books) -> progress -> Memory
-> Prepared, then every other screen once.

Prerequisites (all local, nothing touches production):
  1. Backend on :8787 against a test database (migrations applied), with
     ALLOWED_ORIGINS=http://localhost:1420
  2. The test owner from the seed script: owner@desktop-e2e.starlane.invalid /
     correct-horse-9 with open invoices (Mehta Hardware S/101 is 45 days
     overdue) and three paid Mehta invoices (payment history for Memory)
  3. node scripts/fake-tally.mjs      (stand-in for TallyPrime on :9000)
  4. VITE_STARLANE_API_URL=http://localhost:8787 npx vite --port 1420
  5. DATABASE_URL for the same test database (used once, to record the
     customer's payment the way a Tally sync would)
Screenshots go to $SHOTS_DIR (default ./e2e-shots).
"""
import os
import subprocess
from playwright.sync_api import sync_playwright

out = os.environ.get('SHOTS_DIR', 'e2e-shots').rstrip('/') + '/'
os.makedirs(out, exist_ok=True)
CHROME = os.environ.get('CHROME_PATH')
DB = os.environ['DATABASE_URL']
errors = []
steps = []


def step(name):
    steps.append(name)
    print('ok  ', name)


def nav(pg, label):
    pg.click(f'.nav-item:has-text("{label}")')


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 820})
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('http://localhost:1420'); pg.wait_for_selector('text=Sign in to Starlane')
    pg.screenshot(path=out + '01-signin.png')
    pg.fill('#email', 'owner@desktop-e2e.starlane.invalid'); pg.fill('#pw', 'wrong-password'); pg.click('button:has-text("Sign in")')
    pg.wait_for_selector('text=do not match')
    pg.fill('#pw', 'correct-horse-9'); pg.click('button:has-text("Sign in")')
    pg.wait_for_selector('text=Continue'); step('sign in (wrong password refused first)')
    pg.click('text=Continue'); pg.wait_for_selector('text=Which systems'); pg.wait_for_selector('.opt')
    pg.click('.opt:has-text("Tally")'); pg.click('button:has-text("Continue")')
    pg.wait_for_selector('text=is answering on port 9000')
    pg.wait_for_selector('option:has-text("Sample Company (test)")', state='attached')
    pg.screenshot(path=out + '02-connect-tally.png'); step('Tally found on this computer')
    pg.click('button:has-text("Connect this computer")')
    pg.wait_for_selector('text=records imported', timeout=30000); pg.screenshot(path=out + '03-first-sync.png')
    step('first sync: ' + pg.inner_text('.fig'))

    pg.click('text=Open Starlane'); pg.wait_for_selector('.sentence'); pg.wait_for_timeout(1500)
    sentence = pg.inner_text('.sentence')
    assert 'owed' in sentence, sentence
    pg.screenshot(path=out + '04-bridge.png'); step('The Bridge: ' + sentence)

    nav(pg, 'Watch'); pg.wait_for_selector('.row:has-text("Mehta Hardware")'); pg.wait_for_timeout(400)
    pg.screenshot(path=out + '05-watch.png')
    pg.click('.row:has-text("S/101")'); pg.wait_for_selector('text=Why this was raised'); pg.wait_for_timeout(300)
    pg.screenshot(path=out + '06-watch-event.png'); step('Watch: overdue invoice with evidence')

    pg.click('button:has-text("Scan: why is this happening?")'); pg.wait_for_selector('text=45 days overdue')
    pg.wait_for_selector('text=usually pays about'); pg.wait_for_timeout(300)
    pg.screenshot(path=out + '07-scan.png', full_page=True); step('Scan: why, incl. learned payment timing')

    pg.click('button:has-text("Start a mission to collect")'); pg.wait_for_selector('text=New mission')
    pg.fill('#amt', '100000'); pg.wait_for_selector('text=expected within'); pg.wait_for_timeout(500)
    pg.screenshot(path=out + '08-new-mission.png'); step('Mission draft with simulated outcome')
    pg.click('button:has-text("Start mission")'); pg.wait_for_selector('text=Firm reminder: Mehta Hardware'); pg.wait_for_timeout(400)
    pg.screenshot(path=out + '09-mission-active.png'); step('Mission ACTIVE, reminder proposed for approval')

    pg.click('button:has-text("Simulate")'); pg.wait_for_selector('text=Assumptions'); pg.wait_for_timeout(600)
    before = pg.inner_text('.figure .v >> nth=0')
    slider = pg.locator('input[aria-label^="Assumed rate for 31"]')
    slider.focus(); [pg.keyboard.press('ArrowRight') for _ in range(20)]
    pg.wait_for_selector('text=Set by you'); pg.wait_for_timeout(1200)
    after = pg.inner_text('.figure .v >> nth=0')
    assert before != after, (before, after)
    pg.screenshot(path=out + '10-simulate.png'); step(f'Simulate: expected {before} -> {after} after changing an assumption')
    pg.click('button:has-text("‹ Back")') if pg.locator('button:has-text("‹ Back")').count() else None
    nav(pg, 'Missions'); pg.click('.row:has-text("Collect from Mehta Hardware")'); pg.wait_for_selector('text=Firm reminder: Mehta Hardware')

    pg.click('.row:has-text("Firm reminder: Mehta Hardware")'); pg.wait_for_selector('text=Why Starlane suggests this')
    pg.screenshot(path=out + '11-action.png')
    pg.click('button:has-text("Approve")'); pg.wait_for_selector('text=send the drafted message yourself', timeout=15000)
    pg.wait_for_timeout(500); pg.screenshot(path=out + '12-approved.png'); step('Approved: recorded, honestly not sent (messaging off)')

    subprocess.run(['psql', DB, '-qc', "UPDATE invoices i SET payment_status='Paid', payment_date=CURRENT_DATE::text FROM users u WHERE u.id=i.user_id AND u.email='owner@desktop-e2e.starlane.invalid' AND i.invoice_number='S/101'"], check=True)
    pg.click('button:has-text("Part of a mission")'); pg.wait_for_selector('text=Completed', timeout=15000); pg.wait_for_timeout(500)
    pg.screenshot(path=out + '13-mission-completed.png', full_page=True); step('Payment in the books -> mission COMPLETED')

    nav(pg, 'Memory'); pg.wait_for_selector('text=usually pays about')
    pg.wait_for_selector('text=reached its target')
    pg.click('button:has-text("That’s right") >> nth=0'); pg.wait_for_selector('text=Confirmed by you'); pg.wait_for_timeout(300)
    pg.screenshot(path=out + '14-memory.png', full_page=True); step('Memory: inferred timing confirmed; mission result remembered')

    nav(pg, 'Prepared'); pg.wait_for_selector('text=Next 7 days'); pg.wait_for_selector('text=Kapoor & Co'); pg.wait_for_timeout(300)
    pg.screenshot(path=out + '15-prepared.png', full_page=True); step('Prepared: Kapoor due within 7 days, with reason + source')

    nav(pg, 'The Bridge'); pg.wait_for_timeout(1200); pg.screenshot(path=out + '16-bridge-after.png', full_page=True)
    nav(pg, 'Scan'); pg.fill('input[aria-label="Scan"]', 'kap'); pg.wait_for_selector('.row:has-text("Kapoor & Co")'); pg.screenshot(path=out + '17-scan-search.png')
    nav(pg, 'Sources'); pg.wait_for_selector('text=Where Starlane gets'); pg.wait_for_timeout(400); pg.screenshot(path=out + '18-sources.png')
    nav(pg, 'Settings'); pg.wait_for_selector('text=Signed-in devices'); pg.wait_for_timeout(400); pg.screenshot(path=out + '19-settings.png')
    step('utilities open')
    b.close()

unexpected = [e for e in errors if '401' not in e]
print('console errors (401 from the wrong-password step is expected):', unexpected[:10])
assert not [e for e in unexpected if 'CORS' in e or 'TypeError' in e or 'Error' in e], unexpected
print(f'\nDESKTOP GOLDEN FLOW: {len(steps)} steps passed')
