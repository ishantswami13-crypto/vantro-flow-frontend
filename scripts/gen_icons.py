"""
Generate Vantro PNG icons — the Funnel Mark (three converging bars).
Requires: pip install Pillow
Run: python scripts/gen_icons.py
"""
from PIL import Image, ImageDraw
import os

def make_icon(size):
    s = size / 100.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rx = round(22 * s)

    # Black background
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(bg).rounded_rectangle([0, 0, size-1, size-1], radius=rx, fill=(0, 0, 0, 255))
    img = Image.alpha_composite(img, bg)
    draw = ImageDraw.Draw(img)

    # Inner border
    bw = max(1, round(1.5 * s))
    draw.rounded_rectangle([1, 1, size-2, size-2], radius=rx-1,
                           outline=(255, 255, 255, 25), width=bw)

    bar_rx = round(6.5 * s)

    # Bar 1 — widest
    x1, y1, w1, h1 = round(15*s), round(23*s), round(70*s), round(13*s)
    draw.rounded_rectangle([x1, y1, x1+w1, y1+h1], radius=bar_rx, fill=(255, 255, 255, 255))

    # Bar 2 — medium
    x2, y2, w2, h2 = round(25*s), round(43*s), round(50*s), round(13*s)
    draw.rounded_rectangle([x2, y2, x2+w2, y2+h2], radius=bar_rx, fill=(255, 255, 255, 217))

    # Bar 3 — narrowest
    x3, y3, w3, h3 = round(35*s), round(63*s), round(30*s), round(13*s)
    draw.rounded_rectangle([x3, y3, x3+w3, y3+h3], radius=bar_rx, fill=(255, 255, 255, 153))

    return img

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public")
    for px in [192, 512]:
        icon = make_icon(px)
        path = os.path.join(out_dir, f"icon-{px}.png")
        icon.save(path, "PNG")
        print(f"Saved {path}")
    print("Done.")
