// Stages the Windows release assets under fixed names and writes the manifests
// the website and the in-app updater read. Run by .github/workflows/desktop.yml
// after `tauri build`; also runnable locally to inspect the output.
//
//   node scripts/release-manifest.mjs --bundle src-tauri/target/release/bundle --out release \
//        --tag desktop-v0.1.0 --repo owner/repo [--channel stable|beta] [--sha <git sha>]
//
// Writes to --out:
//   Starlane-Setup-x64.exe      the NSIS installer (the primary download)
//   Starlane-x64.msi            the MSI (for IT-managed installs)
//   *.sig                       updater signatures, when the build was signed for updates
//   SHA256SUMS.txt              sha256sum-compatible checksums
//   starlane-release.json       public manifest: version, platform, arch, URL, SHA-256, size, published_at
//   latest.json                 Tauri updater feed, only when .sig files exist
//
// Refuses (exit 1) when an installer is missing, empty, not a Windows
// executable / MSI, or not the version in tauri.conf.json.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const bundle = opt('bundle', 'src-tauri/target/release/bundle');
const out = opt('out', 'release');
const tag = opt('tag', 'unreleased');
const repo = opt('repo', 'ishantswami13-crypto/vantro-flow-frontend');
const channel = opt('channel', tag === 'desktop-beta' ? 'beta' : 'stable');
const sha = opt('sha', process.env.GITHUB_SHA || null);

const conf = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
const version = conf.version;
const die = (m) => { console.error(`release-manifest: ${m}`); process.exit(1); };

function pick(dir, ext) {
  if (!existsSync(dir)) die(`${dir} does not exist (did tauri build run?)`);
  const files = readdirSync(dir).filter((f) => f.endsWith(ext));
  if (files.length !== 1) die(`expected exactly one ${ext} in ${dir}, found ${files.length}: ${files.join(', ')}`);
  if (!files[0].includes(`_${version}_`)) die(`${files[0]} is not version ${version}`);
  return join(dir, files[0]);
}

const MAGIC = { exe: Buffer.from('MZ'), msi: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) };
function stage(src, name, kind) {
  const size = statSync(src).size;
  if (size < 512 * 1024) die(`${src} is only ${size} bytes`);
  const buf = readFileSync(src);
  if (!buf.subarray(0, MAGIC[kind].length).equals(MAGIC[kind])) die(`${src} is not a ${kind} file`);
  copyFileSync(src, join(out, name));
  let sig = null;
  if (existsSync(`${src}.sig`)) { copyFileSync(`${src}.sig`, join(out, `${name}.sig`)); sig = readFileSync(`${src}.sig`, 'utf8').trim(); }
  return { filename: name, size, sha256: createHash('sha256').update(buf).digest('hex'), sig };
}

mkdirSync(out, { recursive: true });
const exe = stage(pick(join(bundle, 'nsis'), '-setup.exe'), 'Starlane-Setup-x64.exe', 'exe');
const msi = stage(pick(join(bundle, 'msi'), '.msi'), 'Starlane-x64.msi', 'msi');
const url = (name) => `https://github.com/${repo}/releases/download/${tag}/${name}`;
const publishedAt = new Date().toISOString();
const signedUpdates = !!exe.sig;

const manifest = {
  schema: 1,
  product: 'Starlane',
  version,
  channel,
  label: channel === 'beta' ? `Starlane ${version} Beta` : `Starlane ${version} Pilot`,
  published_at: publishedAt,
  git_sha: sha,
  signed: process.env.WINDOWS_CODE_SIGNED === '1',
  updater: signedUpdates,
  platforms: {
    windows: {
      x64: {
        installer: { type: 'nsis', filename: exe.filename, url: url(exe.filename), sha256: exe.sha256, size: exe.size },
        msi: { type: 'msi', filename: msi.filename, url: url(msi.filename), sha256: msi.sha256, size: msi.size },
      },
    },
  },
};
writeFileSync(join(out, 'starlane-release.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(out, 'SHA256SUMS.txt'), `${exe.sha256}  ${exe.filename}\n${msi.sha256}  ${msi.filename}\n`);

if (signedUpdates) {
  // Tauri v2 updater feed. The signature covers the file's bytes, so renaming is safe.
  writeFileSync(join(out, 'latest.json'), JSON.stringify({
    version,
    notes: manifest.label,
    pub_date: publishedAt,
    platforms: { 'windows-x86_64': { signature: exe.sig, url: url(exe.filename) } },
  }, null, 2) + '\n');
}

console.log(`${manifest.label} (${channel}) staged in ${out}/`);
console.log(`  ${exe.filename}  ${exe.size} bytes  sha256 ${exe.sha256}`);
console.log(`  ${msi.filename}  ${msi.size} bytes  sha256 ${msi.sha256}`);
console.log(`  code signed: ${manifest.signed ? 'yes' : 'NO (SmartScreen will warn: unknown publisher)'}`);
console.log(`  updater feed: ${signedUpdates ? 'latest.json written' : 'NOT written (no updater signing key)'}`);
