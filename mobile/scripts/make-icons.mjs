// Draws the Starlane mark (the desktop app's four-point star) into the icon
// set Expo needs, dependency-free: iOS icon (opaque, full-bleed), Android
// adaptive foreground + monochrome (star inside the 66% safe zone), splash
// mark, and web favicon.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const RAIL = [0x1b, 0x1b, 0x18], INK = [0xf2, 0xf1, 0xec];
function crc32(buf) { let c, crc = 0xffffffff; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }

function draw(file, N, { bg, star, radius }) {
  const SS = 3, rows = [];
  const inStar = (x, y) => Math.sqrt(Math.abs(x - N / 2) / (radius * N)) + Math.sqrt(Math.abs(y - N / 2) / (radius * N)) <= 1;
  for (let y = 0; y < N; y++) {
    const row = Buffer.alloc(1 + N * 4);
    for (let x = 0; x < N; x++) {
      let s = 0;
      for (let i = 0; i < SS; i++) for (let j = 0; j < SS; j++) if (inStar(x + (i + .5) / SS, y + (j + .5) / SS)) s++;
      const t = s / (SS * SS), o = 1 + x * 4;
      if (bg) { for (let k = 0; k < 3; k++) row[o + k] = Math.round(bg[k] * (1 - t) + star[k] * t); row[o + 3] = 255; }
      else { for (let k = 0; k < 3; k++) row[o + k] = star[k]; row[o + 3] = Math.round(t * 255); }
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(new URL(`../assets/${file}`, import.meta.url), Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]));
  console.log('assets/' + file);
}

draw('icon.png', 1024, { bg: RAIL, star: INK, radius: 0.3 });
draw('android-icon-foreground.png', 1024, { star: INK, radius: 0.2 });
draw('android-icon-monochrome.png', 1024, { star: [255, 255, 255], radius: 0.2 });
draw('splash-icon.png', 512, { star: INK, radius: 0.42 });
draw('favicon.png', 48, { bg: RAIL, star: INK, radius: 0.32 });
