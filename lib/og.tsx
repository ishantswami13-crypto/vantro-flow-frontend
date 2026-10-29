import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "@/components/brand/wordmark";

// Social cards for the public site, in the site's own language: the dark
// product room, the serif claim with its warm italic, the official wordmark
// and the three promises in mono. Rendered at build time from fonts committed
// in assets/og, so they need no network and no backend.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#E8E9EB";
const WARM = "#E4D8C2";
const FAINT = "#868D97";
const LINE = "#242930";

const font = (file: string) => readFile(path.join(process.cwd(), "assets/og", file));

export async function ogImage({ kicker, title, italic }: { kicker: string; title: string; italic: string }) {
  const [display, displayItalic, sans, mono] = await Promise.all([
    font("Newsreader-Display.ttf"),
    font("Newsreader-DisplayItalic.ttf"),
    font("PlusJakartaSans-Medium.ttf"),
    font("IBMPlexMono-Regular.ttf"),
  ]);
  const wmHeight = 30;
  const wmWidth = Math.round((WORDMARK_VIEWBOX.width / WORDMARK_VIEWBOX.height) * wmHeight);
  const long = (title + italic).length > 44;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px 56px",
          backgroundColor: "#0B0D10",
          backgroundImage:
            "radial-gradient(900px 520px at 22% -10%, rgba(241,231,211,0.13), rgba(241,231,211,0) 70%), radial-gradient(700px 420px at 100% 110%, rgba(134,150,171,0.10), rgba(134,150,171,0) 70%)",
          fontFamily: "Jakarta",
          color: INK,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <svg width={wmWidth} height={wmHeight} viewBox={`0 0 ${WORDMARK_VIEWBOX.width} ${WORDMARK_VIEWBOX.height}`}>
            <path d={WORDMARK_PATH} fill={INK} />
          </svg>
          <span style={{ fontFamily: "Mono", fontSize: 17, letterSpacing: 2.6, color: FAINT, textTransform: "uppercase" }}>{kicker}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Newsreader", fontSize: long ? 80 : 92, lineHeight: 0.98, letterSpacing: -2.4 }}>
          <span style={{ color: INK }}>{title}</span>
          <span style={{ color: WARM, fontStyle: "italic" }}>{italic}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", height: 1, marginBottom: 26, backgroundImage: `linear-gradient(90deg, rgba(241,231,211,0.55), ${LINE} 45%, ${LINE})` }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Mono", fontSize: 15, letterSpacing: 2, color: FAINT, textTransform: "uppercase" }}>
            <span>Read-only connections · Every figure sourced · Nothing sent without approval</span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Newsreader", data: display, style: "normal", weight: 400 },
        { name: "Newsreader", data: displayItalic, style: "italic", weight: 400 },
        { name: "Jakarta", data: sans, style: "normal", weight: 500 },
        { name: "Mono", data: mono, style: "normal", weight: 400 },
      ],
    }
  );
}
