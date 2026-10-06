// Prepares src-tauri/tauri.conf.json for a CI release build from environment
// variables, so no key or certificate detail is ever committed:
//   TAURI_UPDATER_PUBKEY        public half of the updater signing key (repo variable;
//                               defaults to the committed desktop/updater.pub)
//                               → embeds the key and produces signed update artifacts
//   WINDOWS_CERT_THUMBPRINT     thumbprint of the imported code-signing certificate
//                               → Authenticode-signs the installer and the app
// Without them the build still succeeds, but the app reports "updates not
// configured" and Windows shows an unknown-publisher warning. Prints what it
// configured, never the values.
//
// Always, for a release build:
//   - the local development server (localhost:8787) is removed from the app's
//     HTTP permission, so a shipped app can only reach Starlane over HTTPS and
//     TallyPrime on this computer;
//   - with RELEASE_TAG=desktop-vX.Y.Z, the tag must equal the version in
//     tauri.conf.json, package.json and Cargo.toml, or the build stops.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const path = new URL('../src-tauri/tauri.conf.json', import.meta.url);
const conf = JSON.parse(readFileSync(path, 'utf8'));
// The public half is not a secret: it is committed (desktop/updater.pub) so a
// release only needs the private key as a repository secret. A repository
// variable still overrides it.
const committedPubkey = (() => { try { return readFileSync(new URL('../updater.pub', import.meta.url), 'utf8'); } catch { return ''; } })();
const pubkey = (process.env.TAURI_UPDATER_PUBKEY || committedPubkey).trim();
const thumb = (process.env.WINDOWS_CERT_THUMBPRINT || '').trim();
const signingKey = !!(process.env.TAURI_SIGNING_PRIVATE_KEY || '').trim();

const updater = !!(pubkey && signingKey);
if (updater) {
  conf.plugins.updater.pubkey = pubkey;
  conf.bundle.createUpdaterArtifacts = true;
  // Compile-time switch read by src-tauri/src/lib.rs (option_env!).
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, 'STARLANE_UPDATER_CONFIGURED=1\n');
}
if (thumb) {
  conf.bundle.windows = { ...conf.bundle.windows, certificateThumbprint: thumb, digestAlgorithm: 'sha256', timestampUrl: 'http://timestamp.digicert.com' };
}
writeFileSync(path, JSON.stringify(conf, null, 2) + '\n');

// No development server in a release build.
const capPath = new URL('../src-tauri/capabilities/default.json', import.meta.url);
const cap = JSON.parse(readFileSync(capPath, 'utf8'));
let removed = 0;
for (const p of cap.permissions) {
  if (p && typeof p === 'object' && p.identifier === 'http:default') {
    const before = p.allow.length;
    p.allow = p.allow.filter((a) => !/^http:\/\/(localhost|127\.0\.0\.1):8787\//.test(a.url));
    removed += before - p.allow.length;
  }
}
writeFileSync(capPath, JSON.stringify(cap, null, 2) + '\n');
console.log(`development server permission: removed (${removed} entries)`);

// One version everywhere.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const cargo = readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const versions = { 'tauri.conf.json': conf.version, 'package.json': pkg.version, 'Cargo.toml': cargo };
if (new Set(Object.values(versions)).size !== 1) {
  console.error(`version mismatch: ${JSON.stringify(versions)}`);
  process.exit(1);
}
const tag = (process.env.RELEASE_TAG || '').trim();
if (tag && tag !== 'desktop-beta' && tag !== `desktop-v${conf.version}`) {
  console.error(`tag ${tag} does not match app version ${conf.version} (expected desktop-v${conf.version})`);
  process.exit(1);
}
console.log(`version: ${conf.version}${tag ? ` (tag ${tag})` : ''}`);
console.log(`updater: ${updater ? 'configured (signed update artifacts)' : 'NOT configured — app cannot self-update'}`);
console.log(`windows code signing: ${thumb ? 'configured' : 'NOT configured — installer will show an unknown-publisher warning'}`);
