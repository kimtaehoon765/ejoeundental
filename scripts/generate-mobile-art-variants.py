#!/usr/bin/env python3
"""Resize approved original clinic paintings for mobile. Never alter an original.

Each variant is a resolution-only, lossy WebP copy of an existing approved work.
The originals continue to serve full-size gallery viewing and large monitors.
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SPECS = (
    ("ejoeun-gallery-cat-dentist-20261029.webp", 640, "ejoeun-gallery-cat-dentist-20261029-640.webp"),
    ("ejoeun-original-wisdom-consult-20261029.webp", 720, "ejoeun-original-wisdom-consult-20261029-720.webp"),
    ("quiet-window-cat-thumb.webp", 320, "quiet-window-cat-thumb-320.webp"),
    ("cubist-cat-clinic-thumb.webp", 320, "cubist-cat-clinic-thumb-320.webp"),
    ("lakeside-flower-clinic-thumb.webp", 360, "lakeside-flower-clinic-thumb-360.webp"),
    ("starry-night-clinic-thumb.webp", 360, "starry-night-clinic-thumb-360.webp"),
)

for source_name, target_width, output_name in SPECS:
    source_path = ROOT / "assets" / source_name
    target_path = ROOT / "assets" / output_name
    with Image.open(source_path) as img:
        source = ImageOps.exif_transpose(img).convert("RGB")
        src_width, src_height = source.size
        if src_width <= target_width or src_height < 300:
            raise SystemExit(f"Unexpected source dimensions for {source_name}: {source.size}")
        target_height = round(src_height * target_width / src_width)
        result = source.resize((target_width, target_height), Image.Resampling.LANCZOS)
        result.save(target_path, format="WEBP", quality=78, method=6)
    with Image.open(target_path) as check:
        if check.format != "WEBP" or check.size != (target_width, target_height):
            raise SystemExit(f"Invalid resized artwork: {output_name}: {check.size}")
    if target_path.stat().st_size >= source_path.stat().st_size * 0.90:
        raise SystemExit(f"Reduced art unexpectedly large: {output_name}")
    print(f"{source_name}: {src_width}x{src_height} -> {target_width}x{target_height}; "
          f"{source_path.stat().st_size:,} -> {target_path.stat().st_size:,} bytes")
