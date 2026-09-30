#!/usr/bin/env node
// Download health check: proves a download URL hands out the real Starlane
// installer, not a page. Downloads the whole file, following redirects.
//
//   node scripts/check-download.mjs <url> [--type exe|msi] [--manifest <url>] [--min-bytes N]
//
// PASS only when, after redirects:
//   - status is 200
//   - Content-Type is not text/html, not JSON, not text/plain
//   - the body is non-empty and at least --min-bytes (default 1 MB)
//   - the file starts with the Windows executable signature ("MZ") for exe,
//     or the OLE compound-file signature for msi
//   - with --manifest: its SHA-256 and size match the manifest entry
// Anything else exits 1 with the reason. Prints the SHA-256 it measured.
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const url = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const type = opt('type', 'exe');
const manifestUrl = opt('manifest', null);
const minBytes = Number(opt('min-bytes', 1024 * 1024));

const fail = (msg) => { console.error(`DOWNLOAD_ENDPOINT FAIL  ${msg}`); process.exit(1); };
if (!url) fail('usage: check-download.mjs <url> [--type exe|msi] [--manifest <url>]');

const MAGIC = { exe: Buffer.from('MZ'), msi: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) };

async function main() {
  const hops = [];
  let current = url;
  let res;
  for (let i = 0; i < 8; i++) {
    res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(120_000), headers: { 'User-Agent': 'starlane-download-check' } });
    hops.push(`${res.status} ${current}`);
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).toString();
      continue;
    }
    break;
  }
  const first = new URL(url);
  if (first.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(first.hostname)) fail(`${url} is not HTTPS`);
  if (new URL(current).protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(new URL(current).hostname)) fail(`final URL ${current} is not HTTPS`);
  if (res.status !== 200) fail(`status ${res.status} (${hops.join(' -> ')})`);
  const ctype = (res.headers.get('content-type') || '').toLowerCase();
  if (/text\/html|application\/json|text\/plain/.test(ctype)) fail(`content-type ${ctype} is a page, not an installer (${hops.join(' -> ')})`);
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length === 0) fail('zero-byte file');
  if (body.length < minBytes) fail(`only ${body.length} bytes (expected at least ${minBytes})`);
  const magic = MAGIC[type] || MAGIC.exe;
  if (!body.subarray(0, magic.length).equals(magic)) fail(`file does not start with the ${type} signature (starts with ${JSON.stringify(body.subarray(0, 16).toString('latin1'))})`);
  const sha256 = createHash('sha256').update(body).digest('hex');

  if (manifestUrl) {
    const m = await (await fetch(manifestUrl, { signal: AbortSignal.timeout(20_000) })).json();
    const entry = m?.platforms?.windows?.x64?.[type === 'msi' ? 'msi' : 'installer'];
    if (!entry) fail(`manifest ${manifestUrl} has no windows x64 ${type}`);
    if (entry.sha256 !== sha256) fail(`SHA-256 ${sha256} does not match manifest ${entry.sha256}`);
    if (entry.size !== body.length) fail(`size ${body.length} does not match manifest ${entry.size}`);
  }
  console.log(`DOWNLOAD_ENDPOINT PASS  ${url}`);
  console.log(`  path        ${hops.join(' -> ')}`);
  console.log(`  type        ${ctype || '(none)'}, ${type} signature ok`);
  console.log(`  size        ${body.length} bytes`);
  console.log(`  sha256      ${sha256}`);
}

main().catch((e) => fail(e.message));
