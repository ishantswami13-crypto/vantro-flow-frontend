// CI helper: after `expo prebuild`, sign release builds with the real upload
// key when it is provided through secrets; otherwise leave Expo's default
// (debug key — installable for testing only) and say so. Never prints secrets.
import { readFileSync, writeFileSync } from 'node:fs';

const gradlePath = new URL('../android/app/build.gradle', import.meta.url);
const { ANDROID_KEYSTORE, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD } = process.env;
if (!ANDROID_KEYSTORE || !ANDROID_KEYSTORE_PASSWORD || !ANDROID_KEY_ALIAS || !ANDROID_KEY_PASSWORD) {
  console.log('Android signing: no release keystore secrets — the APK is signed with the debug key (internal testing only).');
  process.exit(0);
}
writeFileSync(new URL('../android/app/release.jks', import.meta.url), Buffer.from(ANDROID_KEYSTORE, 'base64'));
let g = readFileSync(gradlePath, 'utf8');
const release = `        release {
            storeFile file('release.jks')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
`;
if (!/signingConfigs \{/.test(g)) throw new Error('signingConfigs block not found in build.gradle');
g = g.replace(/signingConfigs \{\n/, (m) => m + release);
// Point the release build type (the second "signingConfig signingConfigs.debug") at the release key.
const parts = g.split('signingConfig signingConfigs.debug');
if (parts.length !== 3) throw new Error(`expected 2 signingConfig lines, found ${parts.length - 1}`);
g = parts[0] + 'signingConfig signingConfigs.debug' + parts[1] + 'signingConfig signingConfigs.release' + parts[2];
writeFileSync(gradlePath, g);
console.log('Android signing: release keystore configured.');
