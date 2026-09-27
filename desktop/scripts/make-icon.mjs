// Draws the Starlane app mark (a four-point star on the dark rail colour,
// rounded square) into icon-source.png at 1024px, dependency-free, so the
// platform icon set can be regenerated with `npm run icons`.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const N = 1024;
const RAIL = [0x1b, 0x1b, 0x18];
const INK = [0xf2, 0xf1, 0xec];
const SS = 4; // supersampling per axis

function insideSquare(x, y) {
  const r = 0.2 * N, m = 0.06 * N;
  const cx = Math.min(Math.max(x, m + r), N - m - r), cy = Math.min(Math.max(y, m + r), N - m - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= m && x <= N - m && y >= m && y <= N - m;
}
// Four-point star: |dx|^p + |dy|^p <= R^p with p < 1 (astroid-like).
function insideStar(x, y) {
  const dx = Math.abs(x - N / 2) / (0.3 * N), dy = Math.abs(y - N / 2) / (0.3 * N);
  return Math.pow(dx, 0.5) + Math.pow(dy, 0.5) <= 1;
}

const rows = [];
for (let y = 0; y < N; y++) {
  const row = Buffer.alloc(1 + N * 4);
  for (let x = 0; x < N; x++) {
    let sq = 0, st = 0;
    for (let i = 0; i < SS; i++) for (let j = 0; j < SS; j++) {
      const px = x + (i + 0.5) / SS, py = y + (j + 0.5) / SS;
      if (insideSquare(px, py)) { sq++; if (insideStar(px, py)) st++; }
    }
    const a = sq / (SS * SS), t = sq ? st / sq : 0;
    const o = 1 + x * 4;
    for (let c = 0; c < 3; c++) row[o + c] = Math.round(RAIL[c] * (1 - t) + INK[c] * t);
    row[o + 3] = Math.round(a * 255);
  }
  rows.push(row);
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(new URL('../icon-source.png', import.meta.url), png);
console.log('icon-source.png written');
