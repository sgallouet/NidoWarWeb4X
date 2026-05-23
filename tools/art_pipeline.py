"""Crop uneven NidoWar atlas art into owned sprites and debug sheets.

The source atlases are assumed to be imperfect: uneven spacing, inconsistent
scale, and no trustworthy grid. The JSON manifest is the authority.
"""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont


def load_manifest(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def crop_manifest_assets(manifest_path: Path, root: Path) -> list[Path]:
    """Crop all manifest assets to their own runtime sprite files."""
    manifest = load_manifest(manifest_path)
    atlases = {
        key: Image.open(root / value).convert("RGBA")
        for key, value in manifest["sourceAtlases"].items()
    }
    written: list[Path] = []
    for asset_id, asset in manifest["assets"].items():
        if asset.get("source") == "file":
            continue
        if "frames" in asset:
            for frame in asset["frames"]:
                crop = crop_asset_frame(atlases[frame.get("atlas", asset["atlas"])], frame, asset)
                output = root / frame["file"]
                output.parent.mkdir(parents=True, exist_ok=True)
                crop.save(output)
                written.append(output)
            continue
        crop = crop_asset_frame(atlases[asset["atlas"]], asset, asset)
        output = root / asset["file"]
        output.parent.mkdir(parents=True, exist_ok=True)
        crop.save(output)
        written.append(output)
    for atlas in atlases.values():
        atlas.close()
    return written


def crop_asset_frame(atlas: Image.Image, frame: dict, asset: dict) -> Image.Image:
    x, y, width, height = frame["rect"]
    crop = atlas.crop((x, y, x + width, y + height))
    if asset.get("keyBackground") == "checkerWhite":
        crop = remove_checker_background(crop)
    if asset.get("trimAlpha") or asset.get("keyBackground") == "checkerWhite":
        bbox = crop.getchannel("A").getbbox()
        if bbox:
            crop = crop.crop(bbox)
    return crop


def remove_checker_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and abs(red - green) <= 3 and abs(green - blue) <= 3 and red >= 235:
                pixels[x, y] = (0, 0, 0, 0)
    fringe: list[tuple[int, int]] = []
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if not alpha or min(red, green, blue) < 180 or max(red, green, blue) - min(red, green, blue) > 55:
                continue
            touches_transparent = False
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    if pixels[nx, ny][3] == 0:
                        touches_transparent = True
            if touches_transparent:
                fringe.append((x, y))
    for x, y in fringe:
        pixels[x, y] = (0, 0, 0, 0)
    return rgba


def visualize_manifest_crops(manifest_path: Path, root: Path, output: Path) -> Path:
    """Create a contact sheet that makes bad crops and scale mismatches obvious."""
    manifest = load_manifest(manifest_path)
    assets = manifest["assets"]
    cell_w = 220
    cell_h = 190
    columns = 4
    rows = (len(assets) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * cell_w, rows * cell_h), (25, 31, 35, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, (asset_id, asset) in enumerate(assets.items()):
        frame = asset.get("frames", [asset])[0]
        sprite_path = root / frame["file"]
        sprite = Image.open(sprite_path).convert("RGBA")
        draw_meta = asset["draw"]
        placement = asset.get("placement", {})
        footprint = placement.get("footprint", {"width": 1, "height": 1})
        target_h = int(draw_meta.get("height") or draw_meta.get("height", 64))
        if "width" in draw_meta and "height" in draw_meta:
            target_w = int(draw_meta["width"])
            target_h = int(draw_meta["height"])
        else:
            target_w = max(1, round(sprite.width * (target_h / sprite.height)))
        preview = sprite.resize((target_w, target_h), Image.Resampling.LANCZOS)
        col = index % columns
        row = index // columns
        ox = col * cell_w
        oy = row * cell_h
        bx = ox + cell_w // 2
        by = oy + 136
        anchor_x = float(draw_meta.get("anchorX", 0.5))
        anchor_y = float(draw_meta.get("anchorY", 1))
        px = round(bx - target_w * anchor_x)
        py = round(by - target_h * anchor_y)
        draw.line((ox + 8, by, ox + cell_w - 8, by), fill=(78, 211, 146, 180))
        draw.line((bx, oy + 18, bx, oy + cell_h - 24), fill=(78, 211, 146, 180))
        sheet.alpha_composite(preview, (px, py))
        draw.rectangle((px, py, px + target_w, py + target_h), outline=(255, 221, 119, 220))
        draw.text((ox + 6, oy + cell_h - 30), asset_id[-24:], fill=(235, 229, 205), font=font)
        draw.text(
            (ox + 6, oy + 6),
            f"{sprite.width}x{sprite.height}->{target_w}x{target_h} {footprint['width']}x{footprint['height']}",
            fill=(172, 204, 222),
            font=font,
        )
        sprite.close()

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(output)
    return output


def extract_alpha_components(atlas_path: Path, min_area: int = 300) -> list[dict]:
    """Return connected alpha-component bounds for manually authoring manifest rects."""
    image = Image.open(atlas_path).convert("RGBA")
    alpha = image.getchannel("A")
    width, height = image.size
    visited = bytearray(width * height)
    components: list[dict] = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index] or alpha.getpixel((x, y)) < 10:
                visited[index] = 1
                continue
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited[index] = 1
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            while queue:
                cx, cy = queue.popleft()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for ny in range(max(0, cy - 1), min(height, cy + 2)):
                    for nx in range(max(0, cx - 1), min(width, cx + 2)):
                        nindex = ny * width + nx
                        if visited[nindex]:
                            continue
                        visited[nindex] = 1
                        if alpha.getpixel((nx, ny)) >= 10:
                            queue.append((nx, ny))
            if area >= min_area:
                components.append({
                    "rect": [min_x, min_y, max_x - min_x + 1, max_y - min_y + 1],
                    "area": area,
                })
    image.close()
    return sorted(components, key=lambda item: (item["rect"][1], item["rect"][0]))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="ressources/art/assets.json")
    parser.add_argument("--root", default=".")
    parser.add_argument("--debug", default="ressources/art/crop-debug.png")
    parser.add_argument("--components", help="Optional atlas path to print alpha component rects.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if args.components:
        print(json.dumps(extract_alpha_components(root / args.components), indent=2))
        return
    manifest_path = root / args.manifest
    written = crop_manifest_assets(manifest_path, root)
    debug_path = visualize_manifest_crops(manifest_path, root, root / args.debug)
    print(f"cropped={len(written)}")
    print(f"debug={debug_path}")


if __name__ == "__main__":
    main()
