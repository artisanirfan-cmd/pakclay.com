# Step 1 of 2 for the "PakClay New Product images" import (2026-10-21).
# Step 2 is scripts/import-pakclay-new-images.mjs, which uploads what this
# writes. The project has no Node image library (no sharp), and the
# 2026-10-14 category-cover batch also pre-processed with PIL, so the
# resize/compress step lives here.
#
# Usage: python -I scripts/prepare-pakclay-new-images.py <source-dir> <out-dir>
#
# Reads <source-dir>/_IMAGE_MANIFEST.csv and writes ONE file per unique sha1
# (byte-identical duplicates are processed once) as <out-dir>/<sha1>.<ext>,
# plus <out-dir>/index.json: { sha1: { ext, width, height, kb } }.
#
# Rules: long side capped at 1600px (never upscaled), EXIF orientation
# applied. jpg/jpeg -> .jpg q82 progressive. webp kept byte-for-byte unless
# over 1600px or 500 KB, then re-encoded as webp q80. png: these are photos
# saved as PNG (0.6-4.6 MB each), so they become .jpg unless they carry real
# transparency, in which case they become webp q85 (keeps the alpha channel;
# the one cut-out paver shot is 1.5 MB as optimised PNG vs 227 KB as webp).

import csv
import json
import os
import shutil
import sys

from PIL import Image, ImageOps

MAX_SIDE = 1600
WEBP_KEEP_MAX_KB = 500


def has_real_alpha(img):
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        alpha = img.convert("RGBA").getchannel("A")
        return alpha.getextrema()[0] < 255
    return False


def fit(img):
    img = ImageOps.exif_transpose(img)
    if max(img.size) > MAX_SIDE:
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return img


def process(src, ext, out_base):
    with Image.open(src) as img:
        if ext == "webp" and max(img.size) <= MAX_SIDE and os.path.getsize(src) <= WEBP_KEEP_MAX_KB * 1024:
            shutil.copyfile(src, out_base + ".webp")
            return "webp"
        if ext == "webp":
            fit(img).save(out_base + ".webp", "WEBP", quality=80, method=6)
            return "webp"
        if ext == "png" and has_real_alpha(img):
            fit(img).save(out_base + ".webp", "WEBP", quality=85, method=6)
            return "webp"
        fit(img).convert("RGB").save(out_base + ".jpg", "JPEG", quality=82, optimize=True, progressive=True)
        return "jpg"


def main():
    source_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(source_dir, "_IMAGE_MANIFEST.csv"), encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    index = {}
    for row in rows:
        sha1 = row["sha1"]
        if sha1 in index:
            continue
        out_ext = process(os.path.join(source_dir, row["rel_path"]), row["ext"].lower(), os.path.join(out_dir, sha1))
        out_path = os.path.join(out_dir, f"{sha1}.{out_ext}")
        with Image.open(out_path) as done:
            width, height = done.size
        index[sha1] = {"ext": out_ext, "width": width, "height": height, "kb": round(os.path.getsize(out_path) / 1024)}

    with open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, indent=1)
    total_kb = sum(v["kb"] for v in index.values())
    print(f"[prepare] {len(rows)} manifest rows -> {len(index)} unique files, {total_kb / 1024:.1f} MB total, in {out_dir}")


if __name__ == "__main__":
    main()
