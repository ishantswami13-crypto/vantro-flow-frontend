"""Mobile golden flow in the Expo web preview (phone-sized viewport):

push notification tapped -> Watch event -> evidence -> Scan why -> start a
collections Mission -> approve its reminder -> state updates, then the
Bridge / Watch / Scan / Missions / More tabs.

A web preview cannot receive a real push, so the "tap" is the same thing the
app does with one: take the route of the notification Starlane created
(GET /api/client/inbox) and open the screen it maps to (src/lib/routes.ts).

Prerequisites (all local):
  1. Backend on :8787 (test database, migrations applied), ALLOWED_ORIGINS includes http://localhost:8081
  2. A seeded owner (default owner@mobile-e2e.starlane.invalid / correct-horse-9, see the desktop seed)
  3. EXPO_OFFLINE=1 CI=1 EXPO_PUBLIC_STARLANE_API_URL=http://localhost:8787 npx expo start --web --port 8081
"""
import json
import os
import urllib.request
from playwright.sync_api import sync_playwright

API = os.environ.get('API', 'http://localhost:8787')
APP = os.environ.get('APP', 'http://localhost:8081')
EMAIL = os.environ.get('E2E_EMAIL', 'owner@mobile-e2e.starlane.invalid')
out = os.environ.get('SHOTS_DIR', 'e2e-shots').rstrip('/') + '/'
os.makedirs(out, exist_ok=True)
CHROME = os.environ.get('CHROME_PATH')
errors, steps = [], []


def step(name):
    steps.append(name); print('ok  ', name)


def api(path, token=None, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json', **({'Authorization': f'Bearer {token}'} if token else {})})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def open_in_app(pg, path):
    # In-app navigation (the web preview keeps the session in memory only, so a
    # reload would sign out): the same history change a notification tap makes.
    pg.evaluate("p => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate', { state: {} })); }", path)


def mobile_route(route):
    parts = [p for p in route.split('?')[0].split('/') if p]
    if parts[0] == 'watch':
        return f'/event/{parts[1]}' if len(parts) > 1 else '/watch'
    if parts[0] == 'missions' and len(parts) > 1:
        return f'/mission/{parts[1]}'
    if parts[0] == 'actions':
        return f'/actions/{parts[1]}'
    return '/'


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(APP, timeout=120000)
    pg.wait_for_selector('text=Sign in >> visible=true', timeout=120000)
    pg.fill('input[aria-label="Work email"]', EMAIL); pg.fill('input[aria-label="Password"]', 'correct-horse-9')
    pg.get_by_role('button', name='Sign in').click()
    pg.wait_for_selector('text=Needs you >> visible=true', timeout=30000); pg.wait_for_timeout(1200)
    pg.screenshot(path=out + '01-bridge.png', full_page=True); step('signed in; The Bridge')

    token = api('/api/auth/native/login', body={'email': EMAIL, 'password': 'correct-horse-9', 'client': 'mobile', 'platform': 'test'})['accessToken']
    notes = api('/api/client/inbox', token)['notifications']
    push = next(n for n in notes if n['route'].startswith('/watch/'))
    step(f'Watch raised a push: "{push["title"]}" -> {push["route"]}')
    open_in_app(pg, mobile_route(push['route'])); pg.wait_for_selector('text=Why this was raised >> visible=true', timeout=30000); pg.wait_for_timeout(600)
    pg.screenshot(path=out + '02-event-from-push.png', full_page=True); step('push tapped -> the event, with evidence')

    pg.locator('text=Scan: why is this happening? >> visible=true').click(); pg.wait_for_selector('text=days overdue >> visible=true', timeout=20000); pg.wait_for_timeout(600)
    pg.screenshot(path=out + '03-scan.png', full_page=True); step('Scan: why')
    pg.locator('text=Start a mission to collect >> visible=true').click(); pg.wait_for_selector('text=expected within >> visible=true', timeout=20000); pg.wait_for_timeout(500)
    pg.screenshot(path=out + '04-new-mission.png', full_page=True)
    pg.locator('[role=button]:has-text("Start mission") >> visible=true').click(); pg.wait_for_selector('text=Firm reminder >> visible=true', timeout=20000); pg.wait_for_timeout(600)
    pg.screenshot(path=out + '05-mission.png', full_page=True); step('Mission started; reminder proposed')

    pg.locator('text=Firm reminder >> visible=true').first.click(); pg.wait_for_selector('text=Why Starlane suggests this >> visible=true'); pg.wait_for_timeout(400)
    pg.locator('[role=button]:has-text("Approve") >> visible=true').first.click(); pg.wait_for_selector('text=send the drafted message yourself >> visible=true', timeout=20000); pg.wait_for_timeout(600)
    pg.screenshot(path=out + '06-approved.png', full_page=True); step('Approved: recorded, honestly not sent')
    pg.locator('text=Part of a mission › >> visible=true').click(); pg.wait_for_selector('text=Done >> visible=true', timeout=20000); pg.wait_for_timeout(500)
    pg.screenshot(path=out + '07-mission-updated.png', full_page=True); step('Mission shows the action Done')

    open_in_app(pg, '/'); pg.wait_for_selector('text=Needs you >> visible=true', timeout=30000)
    for tab, sel in [('Watch', 'text=Attention'), ('Scan', 'text=cannot change anything'), ('Missions', 'text=Waiting for your decision'), ('More', 'text=Utilities')]:
        pg.get_by_text(tab, exact=True).last.click(); pg.wait_for_selector(sel + ' >> visible=true', timeout=20000); pg.wait_for_timeout(600)
        pg.screenshot(path=out + f'1{len(steps)}-{tab.lower()}.png', full_page=True)
    step('tabs: Bridge / Watch / Scan / Missions / More')
    for name, sel in [('Simulate', 'text=Assumptions'), ('Memory', 'text=usually pays about'), ('Prepared', 'text=Next 7 days')]:
        open_in_app(pg, '/' + name.lower()); pg.wait_for_selector(sel + ' >> visible=true', timeout=30000); pg.wait_for_timeout(600)
        pg.screenshot(path=out + f'2-{name.lower()}.png', full_page=True)
    step('More: Simulate, Memory, Prepared')
    b.close()

bad = [e for e in errors if '401' not in e and 'favicon' not in e]
print('console errors:', bad[:8])
print(f'\nMOBILE GOLDEN FLOW: {len(steps)} steps passed')
