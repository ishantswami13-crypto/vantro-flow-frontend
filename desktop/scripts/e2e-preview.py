"""Drives the desktop web view in a browser preview through first run and every screen.

Prerequisites (all local, nothing touches production):
  1. Backend on :8787 against a test database, with ALLOWED_ORIGINS=http://localhost:1420
  2. A test owner: owner@desktop-e2e.starlane.invalid / correct-horse-9 with a few invoices,
     and pending actions (POST /api/cortex/run-agents {"agents":["collections"]})
  3. node scripts/fake-tally.mjs      (stand-in for TallyPrime on :9000)
  4. VITE_STARLANE_API_URL=http://localhost:8787 npx vite --port 1420
Screenshots go to $SHOTS_DIR (default ./e2e-shots).
"""
import os
from playwright.sync_api import sync_playwright
out=os.environ.get('SHOTS_DIR', 'e2e-shots').rstrip('/') + '/'
os.makedirs(out, exist_ok=True)
CHROME=os.environ.get('CHROME_PATH')
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    pg=b.new_page(viewport={'width':1240,'height':800})
    pg.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('http://localhost:1420'); pg.wait_for_selector('text=Sign in to Starlane')
    pg.screenshot(path=out+'01-signin.png')
    pg.fill('#email','owner@desktop-e2e.starlane.invalid'); pg.fill('#pw','wrong-password'); pg.click('button:has-text("Sign in")')
    pg.wait_for_selector('text=do not match'); print('wrong password message OK')
    pg.fill('#pw','correct-horse-9'); pg.click('button:has-text("Sign in")')
    pg.wait_for_selector('text=Continue'); pg.screenshot(path=out+'02-organization.png')
    pg.click('text=Continue'); pg.wait_for_selector('text=Which systems'); pg.wait_for_selector('.opt')
    pg.click('.opt:has-text("Tally")'); pg.screenshot(path=out+'03-systems.png')
    pg.click('button:has-text("Continue")'); pg.wait_for_selector('text=is answering on port 9000')
    pg.wait_for_selector('option:has-text("Sample Company (test)")', state='attached')
    pg.screenshot(path=out+'04-connect-tally.png')
    pg.click('button:has-text("Connect this computer")')
    pg.wait_for_selector('text=records imported', timeout=30000); pg.screenshot(path=out+'05-first-sync.png')
    print('first sync:', pg.inner_text('.fig'))
    pg.click('text=Open Starlane'); pg.wait_for_selector('.sentence'); pg.wait_for_timeout(1500)
    pg.screenshot(path=out+'06-now.png'); print('sentence:', pg.inner_text('.sentence'))
    pg.click('.row:has-text("Mehta Hardware")'); pg.wait_for_selector('text=Why Starlane suggests this'); pg.wait_for_timeout(300)
    pg.screenshot(path=out+'07-action-evidence.png')
    pg.click('button:has-text("Approve")'); pg.wait_for_selector('text=High-risk action'); pg.screenshot(path=out+'08-high-risk-confirm.png')
    pg.click('button:has-text("Cancel")')
    pg.click('button:has-text("‹ Back")')
    pg.click('.nav-item:has-text("Sources")'); pg.wait_for_selector('text=Where Starlane gets'); pg.wait_for_timeout(500); pg.screenshot(path=out+'09-sources.png')
    pg.click('.row:has-text("Tally")'); pg.wait_for_selector('text=This computer'); pg.wait_for_timeout(500); pg.screenshot(path=out+'10-tally-host.png')
    pg.click('.nav-item:has-text("Decisions")'); pg.wait_for_selector('.tabs'); pg.wait_for_timeout(500); pg.screenshot(path=out+'11-decisions.png')
    pg.click('.nav-item:has-text("Inbox")'); pg.wait_for_timeout(800); pg.screenshot(path=out+'12-inbox.png')
    pg.click('.nav-item:has-text("Simulate")'); pg.wait_for_timeout(800); pg.screenshot(path=out+'13-simulate.png')
    pg.click('.nav-item:has-text("Ask Starlane")'); pg.wait_for_timeout(300); pg.screenshot(path=out+'14-ask.png')
    pg.click('.nav-item:has-text("Settings")'); pg.wait_for_selector('text=Signed-in devices'); pg.wait_for_timeout(600); pg.screenshot(path=out+'15-settings.png')
    b.close()
unexpected=[e for e in errors if '401' not in e]
print('console errors (401 from the wrong-password step is expected):', unexpected[:10])
assert not [e for e in unexpected if 'CORS' in e or 'TypeError' in e], unexpected
