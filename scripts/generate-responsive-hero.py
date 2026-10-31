#!/usr/bin/env python3
"""Create smaller WebP copies of the approved original clinic hero artwork.

The full-resolution image is retained for the gallery and high-DPR desktops.
No retouching, recoloring, generative replacement or content alterations.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ORIGINAL = ROOT / "assets" / "ejoeun-gallery-cat-dentist-20261029.webp"
OUTPUTS = (
    (480, ROOT / "assets" / "ejoeun-gallery-cat-dentist-20261029-480.webp"),
    (720, ROOT / "assets" / "ejoeun-gallery-cat-dentist-20261029-720.webp"),
)

with Image.open(ORIGINAL) as source:
    source = ImageOps.exif_transpose(source)
    if source.size != (1200, 800):
        raise SystemExit(f"Unexpected hero original dimensions: {source.size}")
    original = source.convert("RGB")
    for width, output in OUTPUTS:
        height = round(original.height * width / original.width)
        scaled = original.resize((width, height), Image.Resampling.LANCZOS)
        output.parent.mkdir(parents=True, exist_ok=True)
        scaled.save(output, format="WEBP", quality=80, method=6)
        with Image.open(output) as check:
            if check.size != (width, height) or check.format != "WEBP":
                raise SystemExit(f"Generated image invalid: {output}")
        saved = output.stat().st_size
        print(f"Responsive clinic portrait: {output.name}: {width}x{height}, {saved:,} bytes")
