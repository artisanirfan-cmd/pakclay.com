"""Prepare the 2026-11-05 Drive images (see drive-images-2026-11.plan.json).
Usage: python -E scripts/prepare-drive-images-2026-11.py "<New Drive Images unzipped dir>" scripts/drive-images-2026-11
Resizes to <=1600px long side, JPEG q82 progressive. Crops the photographer-credit strip
from the 3 Gerald Van Rafelghem photos. Output files are named <key>.jpg."""
import json, os, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
plan = json.load(open(os.path.join(os.path.dirname(__file__), "drive-images-2026-11.plan.json"), encoding="utf-8"))
os.makedirs(out, exist_ok=True)
for key, spec in plan["images"].items():
    path = os.path.join(src, spec["file"])
    im = Image.open(path).convert("RGB")
    if spec.get("crop_bottom_pct"):
        w, h = im.size
        im = im.crop((0, 0, w, int(h * (1 - spec["crop_bottom_pct"]))))
    im.thumbnail((1600, 1600), Image.LANCZOS)
    dest = os.path.join(out, key + ".jpg")
    im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"{key}: {im.size} {os.path.getsize(dest)//1024} KB")
