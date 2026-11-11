// Writes an original ambient score for a Starlane film as a WAV file, so the
// films have sound like a launch film does. Pure synthesis, no samples: soft
// detuned pads on a slow chord progression, a low root, and a bell at each
// scene change. Deterministic, so every run gives the same file.
//
//   node scripts/film/score.mjs introducing out.wav
//   node scripts/film/score.mjs command-center out.wav
import { writeFileSync } from "node:fs";

const RATE = 48000;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Each film: length, chords [start seconds, root midi, chord tones as midi], bells [time, midi].
const FILMS = {
  introducing: {
    dur: 60,
    chords: [[0, 50, [62, 66, 69, 73, 76]], [8, 47, [59, 62, 66, 69, 73]], [16, 43, [59, 62, 66, 69, 73]], [24, 45, [61, 64, 69, 71, 76]],
      [31, 50, [62, 66, 69, 73, 78]], [38, 47, [62, 66, 69, 71, 74]], [44, 43, [62, 66, 67, 71, 74]], [50, 45, [61, 64, 69, 73, 76]], [54, 50, [62, 66, 69, 73, 81]]],
    bells: [[0.4, 81], [4.0, 78], [16.1, 76], [21.2, 81], [31.0, 78], [36.0, 74], [44.1, 76], [47.8, 81], [53.3, 78], [54.4, 86]],
  },
  "command-center": {
    dur: 38,
    chords: [[0, 50, [62, 66, 69, 73, 76]], [7, 47, [59, 62, 66, 69, 73]], [14, 43, [59, 62, 66, 69, 73]], [20, 45, [61, 64, 69, 71, 76]],
      [27, 50, [62, 66, 69, 73, 78]], [34, 50, [62, 66, 69, 73, 81]]],
    bells: [[0.4, 81], [4.0, 78], [10.3, 76], [19.7, 81], [26.8, 74], [30.3, 81], [34.5, 86]],
  },
};

const name = process.argv[2] || "introducing";
const out = process.argv[3] || `${name}.wav`;
const f = FILMS[name];
if (!f) throw new Error("unknown film " + name);
const n = Math.round(f.dur * RATE);
const L = new Float32Array(n), R = new Float32Array(n);

// Pads: each chord fades in over 2.5s and out over 3s past the next chord's start.
f.chords.forEach(([start, root, tones], ci) => {
  const end = ci + 1 < f.chords.length ? f.chords[ci + 1][0] + 3 : f.dur;
  const i0 = Math.round(start * RATE), i1 = Math.min(n, Math.round(end * RATE));
  const voices = [[root, .32], [root + 12, .16], ...tones.map((t, k) => [t, .11 - k * .01])];
  for (const [note, amp] of voices) {
    const fr = midi(note);
    for (const [det, pan] of [[-0.11, .8], [0.13, .2]]) {
      const w = 2 * Math.PI * fr * Math.pow(2, det / 12) / RATE, phase = (note * 1.7 + det * 10) % 6.28;
      const gl = Math.cos(pan * Math.PI / 2), gr = Math.sin(pan * Math.PI / 2);
      for (let i = i0; i < i1; i++) {
        const t = (i - i0) / RATE, left = (i1 - i) / RATE;
        const env = Math.min(1, t / 2.5) * Math.min(1, left / 3) * (1 + .12 * Math.sin(t * .7 + note));
        const s = amp * env * (Math.sin(w * (i - i0) + phase) + .18 * Math.sin(2 * w * (i - i0) + phase));
        L[i] += s * gl; R[i] += s * gr;
      }
    }
  }
});

// Bells: a sine with a soft inharmonic partial and a long decay, panned by pitch.
for (const [at, note] of f.bells) {
  const fr = midi(note), i0 = Math.round(at * RATE), len = Math.round(4.5 * RATE), pan = .3 + (note % 7) / 15;
  for (let k = 0; k < len && i0 + k < n; k++) {
    const t = k / RATE, env = Math.min(1, t / .006) * Math.exp(-t * 1.25);
    const s = .22 * env * (Math.sin(2 * Math.PI * fr * t) + .28 * Math.sin(2 * Math.PI * fr * 2.76 * t) * Math.exp(-t * 3) + .12 * Math.sin(2 * Math.PI * fr * 2 * t));
    L[i0 + k] += s * Math.cos(pan * Math.PI / 2); R[i0 + k] += s * Math.sin(pan * Math.PI / 2);
  }
}

// Space: two cross-fed delays for a quiet room, then a fade in and out.
const dl = Math.round(.37 * RATE), dr = Math.round(.53 * RATE);
for (let i = 0; i < n; i++) {
  if (i >= dl) L[i] += .3 * R[i - dl];
  if (i >= dr) R[i] += .3 * L[i - dr];
}
let peak = 0;
for (let i = 0; i < n; i++) {
  const t = i / RATE, g = Math.min(1, t / 1.2) * Math.min(1, (f.dur - t) / 3.5);
  L[i] *= g; R[i] *= g; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = .5 / peak; // peaks at about -6 dBFS: a bed, not a song

const buf = Buffer.alloc(44 + n * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(RATE, 24);
buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
}
writeFileSync(out, buf);
console.log(out);
