import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "@/components/brand/wordmark";

// Social cards for the public site, in the site's own language: a warm
// flat dark field, the serif claim with its warm italic, the official wordmark
// and the three promises. Rendered at build time from fonts committed
// in assets/og, so they need no network and no backend.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#EDEAE4";
const WARM = "#E4D8C2";
const FAINT = "#8E897F";
const LINE = "#2A2825";

const font = (file: string) => readFile(path.join(process.cwd(), "assets/og", file));

export async function ogImage({ kicker, title, italic }: { kicker: string; title: string; italic: string }) {
  const [display, displayItalic, sans] = await Promise.all([
    font("Newsreader-Display.ttf"),
    font("Newsreader-DisplayItalic.ttf"),
    font("PlusJakartaSans-Medium.ttf"),
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
          backgroundColor: "#0F0E0D",
          fontFamily: "Jakarta",
          color: INK,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <svg width={wmWidth} height={wmHeight} viewBox={`0 0 ${WORDMARK_VIEWBOX.width} ${WORDMARK_VIEWBOX.height}`}>
            <path d={WORDMARK_PATH} fill={INK} />
          </svg>
          <span style={{ fontFamily: "Jakarta", fontSize: 22, color: FAINT }}>{kicker}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Newsreader", fontSize: long ? 80 : 92, lineHeight: 0.98, letterSpacing: -2.4 }}>
          <span style={{ color: INK }}>{title}</span>
          <span style={{ color: WARM, fontStyle: "italic" }}>{italic}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", height: 1, marginBottom: 26, backgroundColor: LINE }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Jakarta", fontSize: 20, color: FAINT }}>
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
      ],
    }
  );
}
