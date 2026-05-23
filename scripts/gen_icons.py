"""
Generate Vantro PNG icons (192x192 and 512x512) — black & white design.
Requires: pip install Pillow
Run: python scripts/gen_icons.py
"""
from PIL import Image, ImageDraw
import math, os

def bezier(p0, p1, p2, p3, steps=150):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3*p0[0] + 3*u**2*t*p1[0] + 3*u*t**2*p2[0] + t**3*p3[0]
        y = u**3*p0[1] + 3*u**2*t*p1[1] + 3*u*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def make_icon(size):
    s = size / 100.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rx = round(22 * s)

    # ── Black background with rounded corners ──
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(bg).rounded_rectangle([0, 0, size-1, size-1], radius=rx, fill=(0, 0, 0, 255))
    img = Image.alpha_composite(img, bg)
    draw = ImageDraw.Draw(img)

    # ── Inner border: subtle white ──
    draw.rounded_rectangle([1, 1, size-2, size-2], radius=rx-1,
                           outline=(255, 255, 255, 30), width=max(1, round(1.5*s)))

    # ── LEFT ARM: bold white bezier ──
    arm_l = bezier((18*s, 19*s), (10*s, 40*s), (28*s, 64*s), (50*s, 81*s))
    sw_l = max(3, round(13.5 * s))
    for i in range(len(arm_l) - 1):
        draw.line([arm_l[i], arm_l[i+1]], fill=(255, 255, 255, 252), width=sw_l)
    cap = sw_l // 2
    x0, y0 = arm_l[0]
    draw.ellipse([x0-cap, y0-cap, x0+cap, y0+cap], fill=(255, 255, 255, 252))

    # ── RIGHT ARM: thinner, 75% white ──
    arm_r = bezier((82*s, 19*s), (90*s, 40*s), (72*s, 64*s), (50*s, 81*s))
    sw_r = max(2, round(9 * s))
    for i in range(len(arm_r) - 1):
        draw.line([arm_r[i], arm_r[i+1]], fill=(255, 255, 255, 191), width=sw_r)
    cap2 = sw_r // 2
    x0r, y0r = arm_r[0]
    draw.ellipse([x0r-cap2, y0r-cap2, x0r+cap2, y0r+cap2], fill=(255, 255, 255, 191))

    # ── VERTEX dot ──
    vx, vy = 50*s, 81*s
    vr = max(2, round(3.5 * s))
    draw.ellipse([vx-vr, vy-vr, vx+vr, vy+vr], fill=(255, 255, 255, 255))

    return img

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public")
    for px in [192, 512]:
        icon = make_icon(px)
        path = os.path.join(out_dir, f"icon-{px}.png")
        icon.save(path, "PNG")
        print(f"Saved {path}")
    print("Done.")
