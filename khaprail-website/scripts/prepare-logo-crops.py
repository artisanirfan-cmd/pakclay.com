# Step 1 of 2 for the batch 54 logo/watermark crops (2026-10-30). Step 2 is
# scripts/fix-logo-and-stock-images.mjs. Both read scripts/logo-image-fixes.plan.json.
#
# Usage: python -E -P scripts/prepare-logo-crops.py <source-dir> <out-dir>
#
# Crops each plan "crops" entry from the full-resolution source photo
# (manifest row of <source-dir>/_IMAGE_MANIFEST.csv, EXIF orientation applied)
# to its fractional box, caps the long side at 1600px (same as
# prepare-pakclay-new-images.py) and writes <out-dir>/<manifest>.jpg (q82
# progressive) plus <out-dir>/index.json. Writes nothing into the repo.

import csv
import json
import os
import sys

from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
MAX_SIDE = 1600


def main():
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    plan = json.load(open(os.path.join(HERE, "logo-image-fixes.plan.json"), encoding="utf-8"))
    rows = list(csv.DictReader(open(os.path.join(src_dir, "_IMAGE_MANIFEST.csv"), encoding="utf-8")))
    os.makedirs(out_dir, exist_ok=True)
    index = {}
    for c in plan["crops"]:
        rel = rows[c["manifest"] - 1]["rel_path"]
        img = ImageOps.exif_transpose(Image.open(os.path.join(src_dir, rel))).convert("RGB")
        w, h = img.size
        l, t, r, b = c["box"]
        img = img.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        s = min(1, MAX_SIDE / max(img.size))
        if s < 1:
            img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
        out = os.path.join(out_dir, f"{c['manifest']}.jpg")
        img.save(out, "JPEG", quality=82, progressive=True, optimize=True)
        index[str(c["manifest"])] = {"source": rel, "width": img.width, "height": img.height, "kb": round(os.path.getsize(out) / 1024)}
        print(f"#{c['manifest']:<4} {w}x{h} -> {img.width}x{img.height} {index[str(c['manifest'])]['kb']} KB")
    json.dump(index, open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8"), indent=1)


if __name__ == "__main__":
    main()
