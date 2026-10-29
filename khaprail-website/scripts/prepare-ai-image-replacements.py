# Step 1 of 2 for the batch 54 AI/placeholder image replacement (2026-10-30).
# Step 2 is scripts/replace-ai-images.mjs, which uploads what this writes and
# updates the DB rows / src/assets. Both read scripts/ai-image-replacements.plan.json.
# PIL rather than Node because the project has no Node image library (same
# reason as prepare-pakclay-new-images.py).
#
# Usage: python -E -P scripts/prepare-ai-image-replacements.py <source-dir> <out-dir>
#
# Writes only into <out-dir>, never into the repo:
#   <out-dir>/<slot id>.jpg            one per plan "slots" entry with a manifest #
#   <out-dir>/assets/<prefix>-640.webp, -960.webp, -1600.webp, -1280.jpg
#                                      per plan "assets" entry (hero/heritage)
#   <out-dir>/index.json               { id: { manifest, source, width, height, kb } }
#
# Rules: EXIF orientation applied; optional centre crop to the slot's aspect;
# long side capped at maxLong (never upscaled); JPEG q82 progressive. Asset
# variants are resized to 640/960/1600 wide at the 1600x1067 ratio the
# <img> width/height attributes in src/lib/{hero,heritage}-image.ts declare.
# Refuses any manifest row on the logo/watermark exclusion list.

import csv
import json
import os
import sys

from PIL import Image, ImageOps

EXCLUDED = {11, 92, 93, 101, 104, 124, 138, 146, 154, 168, 170, 171, 172}
HERE = os.path.dirname(os.path.abspath(__file__))


def crop_to(img, aw, ah):
    w, h = img.size
    if w * ah > h * aw:
        nw = round(h * aw / ah)
        x = (w - nw) // 2
        return img.crop((x, 0, x + nw, h))
    nh = round(w * ah / aw)
    y = (h - nh) // 2
    return img.crop((0, y, w, y + nh))


def cap(img, long_side):
    s = min(1, long_side / max(img.size))
    if s < 1:
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    return img


def main():
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    plan = json.load(open(os.path.join(HERE, "ai-image-replacements.plan.json"), encoding="utf-8"))
    rows = list(csv.DictReader(open(os.path.join(src_dir, "_IMAGE_MANIFEST.csv"), encoding="utf-8")))
    os.makedirs(os.path.join(out_dir, "assets"), exist_ok=True)
    index = {}

    def load(n):
        if n in EXCLUDED:
            sys.exit(f"[prepare] manifest #{n} is on the logo/watermark exclusion list - refusing.")
        rel = rows[n - 1]["rel_path"]
        return rel, ImageOps.exif_transpose(Image.open(os.path.join(src_dir, rel))).convert("RGB")

    for slot in plan["slots"]:
        if "manifest" not in slot:
            continue
        rel, img = load(slot["manifest"])
        if "aspect" in slot:
            img = crop_to(img, *slot["aspect"])
        img = cap(img, slot["maxLong"])
        out = os.path.join(out_dir, f"{slot['id']}.jpg")
        img.save(out, "JPEG", quality=82, progressive=True, optimize=True)
        index[slot["id"]] = {"manifest": slot["manifest"], "source": rel, "width": img.width,
                             "height": img.height, "kb": round(os.path.getsize(out) / 1024)}

    for asset in plan.get("assets", []):
        rel, img = load(asset["manifest"])
        img = crop_to(img, *asset["aspect"])
        files = {}
        for w in (640, 960, 1600):
            v = img.resize((w, round(w * asset["aspect"][1] / asset["aspect"][0])), Image.LANCZOS)
            name = f"{asset['prefix']}-{w}.webp"
            v.save(os.path.join(out_dir, "assets", name), "WEBP", quality=asset["webpQuality"], method=6)
            files[name] = round(os.path.getsize(os.path.join(out_dir, "assets", name)) / 1024)
        v = img.resize((1280, round(1280 * asset["aspect"][1] / asset["aspect"][0])), Image.LANCZOS)
        name = f"{asset['prefix']}-1280.jpg"
        v.save(os.path.join(out_dir, "assets", name), "JPEG", quality=80, progressive=True, optimize=True)
        files[name] = round(os.path.getsize(os.path.join(out_dir, "assets", name)) / 1024)
        index[asset["id"]] = {"manifest": asset["manifest"], "source": rel, "source_size": list(img.size), "files_kb": files}

    json.dump(index, open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8"), indent=1)
    for k, v in index.items():
        print(f"{k:22} #{v['manifest']:<4} {v.get('width', '')}x{v.get('height', '')} {v.get('kb', v.get('files_kb'))}")


if __name__ == "__main__":
    main()
