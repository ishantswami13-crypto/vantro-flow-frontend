#!/usr/bin/env node
'use strict';
// scripts/auth-mode-test.js
//
// Guards the login fallback. The backend and frontend sit on different domains
// (Railway and Vercel), so the HttpOnly auth cookie is a third-party cookie:
// Safari blocks those by default and Chrome is restricting them. If the app
// discarded the bearer token on the assumption the cookie works, every request
// would 401 and bounce the user back to /login forever.
//
// saveAuth therefore probes with a cookie-only request and only drops the token
// once that succeeds. These checks pin that behaviour down.
//
// Usage: npm run test:auth-mode

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'authmode-'));
const API_JS = path.join(OUT, 'api.js');

try {
  execFileSync('npx', ['tsc', 'lib/api.ts', '--outDir', OUT, '--module', 'commonjs',
    '--target', 'es2019', '--skipLibCheck', '--esModuleInterop'],
    { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
} catch (err) {
  console.error('Could not compile lib/api.ts:', err.message);
  process.exit(1);
}

function makeBrowser() {
  const store = {};
  let cookies = {};
  globalThis.window = { location: { protocol: 'https:', href: '' } };
  globalThis.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
  globalThis.document = {
    get cookie() { return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(str) {
      const [pair] = str.split(';');
      const [k, v] = pair.split('=');
      if (/max-age=0/.test(str)) delete cookies[k.trim()];
      else cookies[k.trim()] = (v || '').trim();
    },
  };
  return { store, setCookie: (k, v) => { cookies[k] = v; } };
}

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { console.log(`  ok   ${name}`); pass++; }
  else { console.log(`  FAIL ${name} ${detail}`); fail++; }
}

async function run() {
  // ── 1. Bearer mode sends Authorization ──────────────────────────────────
  {
    const b = makeBrowser();
    delete require.cache[API_JS];
    const api = require(API_JS);
    b.store['vantro_token'] = 'jwt-abc';
    const h = api.authHeaders();
    check('bearer mode -> Authorization header', h.Authorization === 'Bearer jwt-abc', JSON.stringify(h));
    check('bearer mode -> no CSRF header', !h['X-CSRF-Token']);
  }

  // ── 2. Cookie mode sends CSRF instead ───────────────────────────────────
  {
    const b = makeBrowser();
    delete require.cache[API_JS];
    const api = require(API_JS);
    b.setCookie('vantro_csrf', 'csrf-xyz');
    const h = api.authHeaders();
    check('cookie mode -> CSRF header', h['X-CSRF-Token'] === 'csrf-xyz', JSON.stringify(h));
    check('cookie mode -> no Authorization', !h.Authorization);
  }

  // ── 3. Backend without cookie mode stays on bearer ──────────────────────
  {
    const b = makeBrowser();
    delete require.cache[API_JS];
    const api = require(API_JS);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
    const mode = await api.saveAuth('jwt-1', { id: 'u1' }, true, null);
    check('no csrf_token -> bearer mode', mode === 'bearer', mode);
    check('no csrf_token -> token kept', b.store['vantro_token'] === 'jwt-1');
  }

  // ── 4. Cookie works -> token discarded ──────────────────────────────────
  {
    const b = makeBrowser();
    delete require.cache[API_JS];
    const api = require(API_JS);
    let sentAuthHeader = null;
    globalThis.fetch = async (url, init) => {
      sentAuthHeader = (init && init.headers && init.headers.Authorization) || null;
      return { ok: true, json: async () => ({ success: true }) };
    };
    const mode = await api.saveAuth('jwt-2', { id: 'u1' }, true, 'csrf-1');
    check('probe succeeds -> cookie mode', mode === 'cookie', mode);
    check('probe succeeds -> token removed', b.store['vantro_token'] === undefined);
    check('probe sent no Authorization header', sentAuthHeader === null, String(sentAuthHeader));
    check('auth mode persisted', b.store['vantro_auth_mode'] === 'cookie');
  }

  // ── 5. THE CRITICAL ONE: browser blocks the cookie -> keep the token ────
  {
    const b = makeBrowser();
    delete require.cache[API_JS];
    const api = require(API_JS);
    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const mode = await api.saveAuth('jwt-3', { id: 'u1' }, true, 'csrf-2');
    check('probe fails -> stays bearer (no login loop)', mode === 'bearer', mode);
    check('probe fails -> token retained', b.store['vantro_token'] === 'jwt-3', b.store['vantro_token']);
    check('probe fails -> mode not switched', b.store['vantro_auth_mode'] === 'bearer');
  }

  // ── 6. Network error during probe is treated as failure ─────────────────
  {
    const b = makeBrowser();
    delete require.cache[API_JS];
    const api = require(API_JS);
    globalThis.fetch = async () => { throw new Error('network down'); };
    const mode = await api.saveAuth('jwt-4', { id: 'u1' }, true, 'csrf-3');
    check('probe throws -> stays bearer', mode === 'bearer', mode);
    check('probe throws -> token retained', b.store['vantro_token'] === 'jwt-4');
  }

  // ── 7. Logout clears everything ─────────────────────────────────────────
  {
    const b = makeBrowser();
    delete require.cache[API_JS];
    const api = require(API_JS);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
    await api.saveAuth('jwt-5', { id: 'u1' }, true, 'csrf-4');
    api.clearAuth();
    check('clearAuth removes token', b.store['vantro_token'] === undefined);
    check('clearAuth removes user', b.store['vantro_user'] === undefined);
    check('clearAuth removes auth mode', b.store['vantro_auth_mode'] === undefined);
  }

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
  fs.rmSync(OUT, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
}

run();
