// Prepares src-tauri/tauri.conf.json for a CI release build from environment
// variables, so no key or certificate detail is ever committed:
//   TAURI_UPDATER_PUBKEY        public half of the updater signing key (repo variable)
//                               → embeds the key and produces signed update artifacts
//   WINDOWS_CERT_THUMBPRINT     thumbprint of the imported code-signing certificate
//                               → Authenticode-signs the installer and the app
// Without them the build still succeeds, but the app reports "updates not
// configured" and Windows shows an unknown-publisher warning. Prints what it
// configured, never the values.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const path = new URL('../src-tauri/tauri.conf.json', import.meta.url);
const conf = JSON.parse(readFileSync(path, 'utf8'));
const pubkey = (process.env.TAURI_UPDATER_PUBKEY || '').trim();
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
console.log(`updater: ${updater ? 'configured (signed update artifacts)' : 'NOT configured — app cannot self-update'}`);
console.log(`windows code signing: ${thumb ? 'configured' : 'NOT configured — installer will show an unknown-publisher warning'}`);
