#!/usr/bin/env node
'use strict';
// scripts/check-dependency-audit.js
//
// Fails on any high or critical advisory in the production dependency tree,
// except ones explicitly allowlisted below with a reason.
//
// The allowlist is empty, and that is the point: production dependencies are at
// zero advisories, so anything this reports is something a change introduced
// rather than debt that was already there. Keep it empty if at all possible —
// an entry here means shipping a known vulnerability.
//
// Dev dependencies are excluded on purpose: they do not ship, and the eslint
// toolchain generates enough advisory noise to bury anything real.
//
// Usage:
//   node scripts/check-dependency-audit.js
//   npm run security:audit-gate

const { execFileSync } = require('child_process');

// Each entry needs a reason, a reachability assessment, and the condition that
// would let it be removed — not just an ID. See the backend's copy of this file
// for a worked example.
const ALLOWLIST = [];

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);

function runAudit() {
  try {
    // npm audit exits non-zero when it finds anything, so the throw is expected
    // and the JSON we want is on stdout either way.
    const out = execFileSync('npm', ['audit', '--omit=dev', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    return JSON.parse(out);
  } catch (err) {
    if (err.stdout) {
      try { return JSON.parse(err.stdout); } catch { /* fall through */ }
    }
    console.error('[SECURITY] Could not run npm audit:', err.message);
    process.exit(1);
  }
}

// Wraps a labelled paragraph to a readable width. Naive truncation to the first
// sentence cuts version numbers in half ("fixed in >= 0.").
function wrap(text, label, indent, width = 84) {
  const pad = ' '.repeat(indent);
  const head = `${pad}${label}: `;
  const cont = ' '.repeat(head.length);
  const out = [];
  let line = head;
  for (const word of text.split(/\s+/)) {
    if (line.length + word.length + 1 > width && line.trim() !== label + ':') {
      out.push(line);
      line = cont + word;
    } else {
      line += (line === head || line === cont ? '' : ' ') + word;
    }
  }
  out.push(line);
  return out.join('\n');
}

function main() {
  console.log('[SECURITY] Auditing production dependencies...');

  const report = runAudit();
  const allowed = new Set(ALLOWLIST.map(a => a.id));

  const blocking = [];
  const acknowledged = [];

  for (const [pkg, v] of Object.entries(report.vulnerabilities || {})) {
    if (!BLOCKING_SEVERITIES.has(v.severity)) continue;
    for (const via of (v.via || [])) {
      if (typeof via !== 'object') continue;
      const id = (via.url || '').split('/').pop();
      if (allowed.has(id)) acknowledged.push({ pkg, id, title: via.title });
      else blocking.push({ pkg, id, title: via.title, severity: v.severity, url: via.url });
    }
  }

  if (acknowledged.length) {
    console.log(`\n  ${acknowledged.length} known, unfixable advisory(ies) — allowlisted, not ignored:`);
    for (const a of acknowledged) {
      const entry = ALLOWLIST.find(e => e.id === a.id);
      console.log(`    ${a.pkg} ${a.id} — ${a.title}`);
      console.log(wrap(entry.reason, 'why it stays', 6));
      console.log(wrap(entry.reachable, 'reachable', 6));
    }
  }

  // An allowlist entry for something no longer reported means the problem is
  // gone and the exception should be deleted rather than left to rot.
  const reported = new Set(acknowledged.map(a => a.id));
  const stale = ALLOWLIST.filter(a => !reported.has(a.id));
  if (stale.length) {
    console.log(`\n  ${stale.length} allowlist entry(ies) no longer reported — remove them:`);
    stale.forEach(s => console.log(`    ${s.package} ${s.id}`));
  }

  if (blocking.length === 0) {
    console.log(`\n[SECURITY] Dependency Audit Passed: no unreviewed high or critical advisories.`);
    return;
  }

  console.error(`\n[SECURITY] Dependency Audit FAILED — ${blocking.length} unreviewed advisory(ies):\n`);
  for (const b of blocking) {
    console.error(`  ${b.pkg} [${b.severity}] ${b.id}`);
    console.error(`    ${b.title}`);
    console.error(`    ${b.url}`);
    console.error('');
  }
  console.error('Upgrade the dependency, or add the advisory to ALLOWLIST in this file with a');
  console.error('reason, a reachability assessment, and the condition that would remove it.\n');
  process.exit(1);
}

main();
