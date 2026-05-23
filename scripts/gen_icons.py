"""
Generate Vantro PNG icons (192x192 and 512x512) from the SVG design.
Requires: pip install Pillow
Run from the project root: python scripts/gen_icons.py
"""
from PIL import Image, ImageDraw, ImageFilter
import math

def bezier(p0, p1, p2, p3, steps=120):
    """Sample a cubic bezier curve — returns list of (x, y) points."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3*p0[0] + 3*u**2*t*p1[0] + 3*u*t**2*p2[0] + t**3*p3[0]
        y = u**3*p0[1] + 3*u**2*t*p1[1] + 3*u*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def make_icon(size):
    scale = size / 100.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    rx = round(22 * scale)

    # ── Background: dark navy gradient (approximated as two-tone fill) ──
    # Create gradient layer
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    col_top = (14, 24, 48)     # #0E1830
    col_bot = (6,   9, 26)     # #06091A
    for y in range(size):
        t = y / size
        col = lerp_color(col_top, col_bot, t)
        bg_draw.line([(0, y), (size, y)], fill=col + (255,))
    # Mask to rounded rect
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size-1, size-1], radius=rx, fill=255)
    img.paste(bg, mask=mask)

    draw = ImageDraw.Draw(img)

    # ── Vertex glow ──
    vx, vy = 50 * scale, 81 * scale
    glow_r = int(22 * scale)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for r in range(glow_r, 0, -1):
        alpha = int(140 * (1 - r / glow_r) ** 1.5)
        ImageDraw.Draw(glow).ellipse(
            [vx - r, vy - r, vx + r, vy + r],
            fill=(37, 99, 235, alpha)
        )
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # ── LEFT ARM: bold calligraphic bezier ──
    # SVG path: M 18,19 C 10,40 28,64 50,81
    arm_l = bezier(
        (18*scale, 19*scale),
        (10*scale, 40*scale),
        (28*scale, 64*scale),
        (50*scale, 81*scale),
    )
    sw_l = max(2, int(13.5 * scale))
    # Gradient: #5AABFF → #1040CC along the arm
    col_l_top = (90, 171, 255)
    col_l_bot = (16,  64, 204)
    for i in range(len(arm_l) - 1):
        t = i / len(arm_l)
        col = lerp_color(col_l_top, col_l_bot, t) + (248,)
        draw.line([arm_l[i], arm_l[i+1]], fill=col, width=sw_l)
    # Round caps
    cap_r = sw_l // 2
    x0, y0 = arm_l[0]
    draw.ellipse([x0-cap_r, y0-cap_r, x0+cap_r, y0+cap_r], fill=col_l_top+(248,))

    # ── RIGHT ARM: thinner, purple ──
    # SVG path: M 82,19 C 90,40 72,64 50,81
    arm_r = bezier(
        (82*scale, 19*scale),
        (90*scale, 40*scale),
        (72*scale, 64*scale),
        (50*scale, 81*scale),
    )
    sw_r = max(2, int(9 * scale))
    col_r_top = (157, 111, 255)
    col_r_bot  = ( 91,  16, 224)
    for i in range(len(arm_r) - 1):
        t = i / len(arm_r)
        col = lerp_color(col_r_top, col_r_bot, t) + (230,)
        draw.line([arm_r[i], arm_r[i+1]], fill=col, width=sw_r)
    cap_r2 = sw_r // 2
    x0r, y0r = arm_r[0]
    draw.ellipse([x0r-cap_r2, y0r-cap_r2, x0r+cap_r2, y0r+cap_r2], fill=col_r_top+(230,))

    # ── Vertex: halo → blue → white core ──
    img2 = img.copy()
    draw2 = ImageDraw.Draw(img2)
    vr1 = max(2, int(5 * scale))
    vr2 = max(1, int(3.2 * scale))
    vr3 = max(1, int(1.6 * scale))
    draw2.ellipse([vx-vr1, vy-vr1, vx+vr1, vy+vr1], fill=(26, 111, 255, 90))
    draw2.ellipse([vx-vr2, vy-vr2, vx+vr2, vy+vr2], fill=(96, 165, 250, 255))
    draw2.ellipse([vx-vr3, vy-vr3, vx+vr3, vy+vr3], fill=(255, 255, 255, 255))
    img = img2

    # ── Inner glass border ──
    draw3 = ImageDraw.Draw(img)
    draw3.rounded_rectangle(
        [1, 1, size-2, size-2], radius=rx-1,
        outline=(255, 255, 255, 20), width=2
    )

    return img

if __name__ == "__main__":
    import os
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public")

    for px in [192, 512]:
        icon = make_icon(px)
        path = os.path.join(out_dir, f"icon-{px}.png")
        icon.save(path, "PNG")
        print(f"Saved {path}")

    print("Done! Icons generated.")
