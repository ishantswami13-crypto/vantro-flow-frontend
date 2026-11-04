// Renders scripts/film/command-center.html to a real video, frame by frame.
//
//   node scripts/film/render.mjs              # public/film/command-center.{mp4,webm,jpg}
//   node scripts/film/render.mjs --still 12   # one PNG at 12s, for checking a frame
//
// Needs Playwright (Chromium) and ffmpeg on the PATH. Every frame is drawn by
// the page's render(t), so the output is identical on every run.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Playwright is resolved like CommonJS so a global install (NODE_PATH) works too.
const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "public/film");
const FPS = 30;

const brand = {
  m: readFileSync(path.join(root, "components/brand/StarlaneMark.tsx"), "utf8").match(/STARLANE_S_PATH =\s*"([^"]+)"/)[1],
  w: readFileSync(path.join(root, "components/brand/wordmark.ts"), "utf8").match(/WORDMARK_PATH =\s*"([^"]+)"/)[1],
};

const args = process.argv.slice(2);
const stillAt = args.includes("--still") ? Number(args[args.indexOf("--still") + 1]) : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.addInitScript((b) => { window.__BRAND = b; }, brand);
await page.goto(pathToFileURL(path.join(here, "command-center.html")).href + "?drive");
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.__film.DURATION);

if (stillAt !== null) {
  await page.evaluate((t) => window.__film.render(t), stillAt);
  const file = path.join(process.env.FILM_STILL_DIR || here, `still-${stillAt}.png`);
  await page.screenshot({ path: file });
  console.log(file);
  await browser.close();
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
const master = path.join(outDir, ".master.mp4");
// Near-lossless master first, then the two delivery encodes from it.
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "10", "-pix_fmt", "yuv420p", master], { stdio: ["pipe", "inherit", "inherit"] });

const frames = Math.round(duration * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.__film.render(t), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 150 === 0) console.log(`frame ${f}/${frames}`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg " + c)))));
await browser.close();

const run = (a) => new Promise((r, j) => spawn("ffmpeg", ["-y", "-loglevel", "error", ...a], { stdio: "inherit" }).on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg " + c)))));
await run(["-i", master, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-tune", "animation", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path.join(outDir, "command-center.mp4")]);
await run(["-i", master, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-an", path.join(outDir, "command-center.webm")]);
await run(["-ss", "14", "-i", master, "-frames:v", "1", "-q:v", "3", path.join(outDir, "command-center-poster.jpg")]);
await run(["-ss", "1.9", "-i", master, "-frames:v", "1", "-q:v", "3", path.join(outDir, "command-center-title.jpg")]);
rmSync(master);
console.log("done:", outDir);
