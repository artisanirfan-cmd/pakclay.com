"""Usage: python -E scripts/prepare-new-images-2026-11-22.py <staged-dir> scripts/new-images-2026-11-22
Resizes each plan file to <=1600px long side, JPEG q82 progressive -> <out>/<key>.jpg. No logos found, so no crops."""
import json, os, sys
from PIL import Image, ImageOps
src, out = sys.argv[1], sys.argv[2]
plan = json.load(open(os.path.join(os.path.dirname(__file__), "new-images-2026-11-22.plan.json"), encoding="utf-8"))
os.makedirs(out, exist_ok=True)
for key, f in plan["files"].items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(src, f))).convert("RGB")
    im.thumbnail((1600, 1600), Image.LANCZOS)
    d = os.path.join(out, key + ".jpg")
    im.save(d, "JPEG", quality=82, optimize=True, progressive=True)
    print(key, im.size, os.path.getsize(d)//1024, "KB")
