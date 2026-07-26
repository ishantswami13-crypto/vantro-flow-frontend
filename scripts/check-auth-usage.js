#!/usr/bin/env node
'use strict';
// scripts/check-auth-usage.js
//
// Fails if anything outside lib/api.ts reads the session token from
// localStorage.
//
// The app supports two auth modes. In cookie mode the session lives in an
// HttpOnly cookie that JavaScript cannot read, so localStorage holds no token
// and any component fetching its own `Authorization: Bearer ${token}` header
// sends nothing — every one of its requests 401s. That failure is invisible in
// bearer mode, which is what runs today, so it would land silently and only
// surface when cookie auth is switched on.
//
// The rule is therefore: lib/api.ts owns the token, and everything else
// authenticates through authHeaders(). Roughly ninety call sites were migrated
// to that in one pass; this keeps the next new fetch from quietly reintroducing
// the old shape.
//
// Usage: npm run security:auth-usage

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'lib'];
const SESSION_KEY = 'vantro_token';

// lib/api.ts is the one place allowed to touch the token: it is what getToken()
// and authHeaders() are built on.
const ALLOWED = new Set([path.join('lib', 'api.ts')]);

// The signup OTP screen legitimately sends an explicit bearer token, but it is a
// short-lived pre-verification token from the signup response — never the
// session — so it is unaffected by auth mode and is not what this checks for.

function walk(dir, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function main() {
  console.log('[SECURITY] Checking session-token access is confined to lib/api.ts...');

  const violations = [];
  let scanned = 0;

  for (const dir of SCAN_DIRS) {
    for (const rel of walk(dir)) {
      if (ALLOWED.has(rel)) continue;
      scanned++;
      const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
      lines.forEach((line, i) => {
        // Reading the session key at all, or building a bearer header from it.
        if (line.includes(`getItem("${SESSION_KEY}")`) || line.includes(`getItem('${SESSION_KEY}')`)) {
          violations.push({ file: rel, line: i + 1, source: line.trim(), why: 'reads the session token directly' });
        }
      });
    }
  }

  if (violations.length === 0) {
    console.log(`[SECURITY] Auth Usage Passed: ${scanned} files scanned, none read the session token.`);
    return;
  }

  console.error(`\n[SECURITY] Auth Usage FAILED — ${violations.length} direct session-token read(s):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} — ${v.why}`);
    console.error(`    ${v.source.slice(0, 100)}`);
    console.error('');
  }
  console.error('Use authHeaders() from lib/api.ts and set credentials: "include" instead.');
  console.error('It returns the bearer token or the CSRF header depending on the active mode,');
  console.error('so the call site works under both and keeps working when cookie auth is on.\n');
  process.exit(1);
}

main();
