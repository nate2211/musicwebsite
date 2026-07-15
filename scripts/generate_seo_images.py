#!/usr/bin/env python3
"""Generate original 1200x630 social preview images for MusicStudioLab pages."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

OUT = Path(__file__).resolve().parents[1] / "public" / "og"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1200, 630

PAGES = {
    "musicstudiolab-online-beat-maker.png": ("ONLINE BEAT MAKER", "Make beats. Design sounds.\nFinish the record.", "Browser DAW · Synth · Piano Roll · Mixer · WAV Export"),
    "musicstudiolab-browser-daw.png": ("PRODUCTION STUDIO", "A complete browser DAW\nfor modern hip-hop.", "Channel Rack · Playlist · Automation · Mastering"),
    "musicstudiolab-online-synthesizer.png": ("SYNTH LAB", "Build custom basses,\nleads, pads and keys.", "3 Oscillators · FM · Filters · LFOs · Unison · Effects"),
    "musicstudiolab-808-drum-sounds.png": ("FACTORY SOUNDS", "Original 808s, drums,\nloops and synth presets.", "332 WAV Assets · 168 Editable Patches"),
    "musicstudiolab-hip-hop-workflow.png": ("PRODUCTION WORKFLOW", "From the first drum hit\nto the final WAV.", "Sequence · Compose · Arrange · Mix · Automate · Master"),
    "musicstudiolab-help-guide.png": ("HELP CENTER", "Guides for the studio,\nsynth, projects and export.", "Browser Audio · MIDI · Troubleshooting · Windows Install"),
}

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def rounded_gradient_card(base, xy, radius=28):
    x0, y0, x1, y1 = xy
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(xy, radius=radius, fill=(12, 18, 39, 225), outline=(120, 167, 255, 80), width=2)
    return Image.alpha_composite(base.convert("RGBA"), layer)


def create(filename, kicker, headline, subline):
    img = Image.new("RGB", (W, H), "#050711")
    px = img.load()
    for y in range(H):
        for x in range(W):
            dx, dy = x / W, y / H
            glow1 = max(0.0, 1 - math.hypot(dx - 0.82, dy - 0.15) / 0.55)
            glow2 = max(0.0, 1 - math.hypot(dx - 0.18, dy - 0.82) / 0.6)
            r = int(5 + 22 * glow1 + 3 * glow2)
            g = int(7 + 14 * glow1 + 24 * glow2)
            b = int(17 + 32 * glow1 + 28 * glow2)
            px[x, y] = (r, g, b)

    draw = ImageDraw.Draw(img, "RGBA")
    for x in range(0, W, 52):
        draw.line((x, 0, x, H), fill=(255, 255, 255, 12), width=1)
    for y in range(0, H, 52):
        draw.line((0, y, W, y), fill=(255, 255, 255, 10), width=1)

    # Decorative spectrum / sequencer panel.
    img = rounded_gradient_card(img, (730, 94, 1128, 530), 30)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rounded_rectangle((770, 136, 1088, 236), 18, fill=(6, 10, 24, 220), outline=(101, 228, 194, 50), width=2)
    points = []
    for x in range(786, 1075, 6):
        y = 186 + math.sin(x * 0.055) * 27 + math.sin(x * 0.12) * 11
        points.append((x, y))
    draw.line(points, fill=(101, 228, 194, 235), width=4, joint="curve")
    for row in range(5):
        for col in range(12):
            x0 = 770 + col * 26
            y0 = 276 + row * 38
            active = (col + row * 2) % (3 + row % 2) == 0
            fill = (120, 167, 255, 210) if active else (255, 255, 255, 22)
            if row == 3 and active:
                fill = (187, 140, 255, 220)
            draw.rounded_rectangle((x0, y0, x0 + 17, y0 + 17), 4, fill=fill)
    draw.text((770, 486), "142 BPM  •  4/4  •  C MINOR", font=font(FONT_BOLD, 16), fill=(199, 214, 241, 210))

    # Brand mark.
    draw.rounded_rectangle((68, 58, 124, 114), 16, fill=(10, 15, 34, 255), outline=(101, 228, 194, 95), width=2)
    wave = []
    for x in range(78, 114):
        wave.append((x, 86 + math.sin((x - 78) * 0.42) * 11))
    draw.line(wave, fill=(101, 228, 194, 255), width=4)
    draw.text((142, 63), "MusicStudioLab", font=font(FONT_BOLD, 30), fill=(244, 248, 255, 255))
    draw.text((142, 97), "Browser music production workstation", font=font(FONT_REG, 15), fill=(170, 188, 220, 220))

    draw.rounded_rectangle((68, 160, 295, 198), 19, fill=(101, 228, 194, 24), outline=(101, 228, 194, 90), width=1)
    draw.text((88, 170), kicker, font=font(FONT_BOLD, 14), fill=(119, 239, 210, 255))

    y = 226
    for line in headline.split("\n"):
        draw.text((68, y), line, font=font(FONT_BOLD, 48), fill=(248, 250, 255, 255), stroke_width=1, stroke_fill=(248, 250, 255, 15))
        y += 62
    draw.text((70, 382), subline, font=font(FONT_REG, 21), fill=(190, 205, 232, 245))
    draw.rounded_rectangle((68, 466, 350, 520), 14, fill=(104, 155, 255, 235))
    draw.text((92, 482), "musicstudiolab.com", font=font(FONT_BOLD, 20), fill=(255, 255, 255, 255))

    # Soft highlight.
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((885, -180, 1390, 325), fill=(120, 135, 255, 38))
    glow = glow.filter(ImageFilter.GaussianBlur(55))
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    img.convert("RGB").save(OUT / filename, "PNG", optimize=True)


for name, content in PAGES.items():
    create(name, *content)
print(f"Generated {len(PAGES)} SEO images in {OUT}")
