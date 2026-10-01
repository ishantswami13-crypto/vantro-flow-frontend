// Regenerates every raster Starlane icon from the vector mark in
// public/brand/starlane-mark.svg (a serif S on a black rounded square):
// website favicons and PWA icons, the Open Graph lockup, the desktop app's
// icon source (then `npx tauri icon` in desktop/ makes .ico/.icns/.png), and
// the Expo icons in mobile/assets.
//
//   node scripts/brand-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const tileSvg = read('public/brand/starlane-mark.svg');
const sPath = tileSvg.match(/<path d="([^"]+)"/)[1];

const INK = '#0B0B0C';
const IVORY = '#F7F5F0';
// The S alone, scaled by `scale` around the centre of a 100-unit square.
const glyph = (fill, scale = 1, bg = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${bg}` +
  `<g transform="translate(50 50) scale(${scale}) translate(-50 -50)"><path d="${sPath}" fill="${fill}"/></g></svg>`;

async function png(svg, size, out, { flatten } = {}) {
  let img = sharp(Buffer.from(svg), { density: Math.max(72, Math.ceil((size / 100) * 72 * 2)) }).resize(size, size);
  if (flatten) img = img.flatten({ background: flatten });
  await img.png().toFile(new URL(out, root).pathname);
  console.log(out);
}

// Website
for (const n of [180, 192, 512]) await png(tileSvg, n, `public/branding/starlane-icon-light-${n}.png`);
await png(tileSvg, 192, 'public/icon-192.png');
await png(tileSvg, 512, 'public/icon-512.png');
await png(tileSvg, 512, 'public/branding/starlane-mark.png');
await png(glyph(INK, 1.3), 512, 'public/brand/starlane-icon-transparent.png');
await sharp(Buffer.from(tileSvg), { density: 600 }).resize(512, 512).flatten({ background: '#ffffff' }).jpeg({ quality: 92 })
  .toFile(new URL('public/brand/starlane-icon.jpeg', root).pathname);

// Open Graph lockup: black artwork on transparent, inlined as a data URI.
const lockup = read('public/brand/starlane-lockup.svg');
const [, vw, vh] = lockup.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
const ogW = 620, ogH = Math.round((vh / vw) * ogW);
const ogPng = await sharp(Buffer.from(lockup), { density: 300 }).resize(ogW, ogH).png().toBuffer();
writeFileSync(new URL('app/og-wordmark.ts', root),
  '// The Starlane lockup (serif S mark + "Starlane" in Fraunces), rendered from\n' +
  '// public/brand/starlane-lockup.svg by scripts/brand-icons.mjs. Inlined as a data\n' +
  '// URI so the OG renderer needs no filesystem or network access at request time.\n' +
  `export const STARLANE_WORDMARK = "data:image/png;base64,${ogPng.toString('base64')}";\n` +
  `export const STARLANE_WORDMARK_SIZE = { width: ${ogW}, height: ${ogH} };\n`);
console.log('app/og-wordmark.ts');
await sharp(Buffer.from(lockup.replace(/(<g[^>]*><path d="[^"]+" fill=")#0B0B0C/, `$1${IVORY}`)), { density: 300 })
  .resize(1200).extend({ top: 400, bottom: 400, left: 200, right: 200, background: INK }).flatten({ background: INK }).jpeg({ quality: 92 })
  .toFile(new URL('public/brand/starlane-wordmark.jpeg', root).pathname);
console.log('public/brand/starlane-wordmark.jpeg');

// Desktop (Tauri): full-size source, then `npx tauri icon icon-source.png` in desktop/.
await png(tileSvg, 1024, 'desktop/icon-source.png');
await png(tileSvg, 64, 'desktop/public/favicon.png');

// Mobile (Expo). iOS masks its own corners, so the icon is full-bleed; Android's
// adaptive foreground keeps the S inside the 66% safe zone.
const square = (fill) => `<rect width="100" height="100" fill="${fill}"/>`;
await png(glyph(IVORY, 1, square(INK)), 1024, 'mobile/assets/icon.png');
await png(glyph(IVORY, 0.75), 1024, 'mobile/assets/android-icon-foreground.png');
await png(glyph('#FFFFFF', 0.75), 1024, 'mobile/assets/android-icon-monochrome.png');
await png(glyph(IVORY, 1.2), 512, 'mobile/assets/splash-icon.png');
await png(tileSvg, 48, 'mobile/assets/favicon.png');
