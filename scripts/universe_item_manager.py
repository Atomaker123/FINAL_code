"""
universe_item_manager.py
Core library to manage, pack, and synchronize custom items into Scale of the Universe 2.
"""

import os
import json
import math
import re
import shutil
from PIL import Image

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LIBRARY_DIR = os.path.join(ROOT_DIR, 'custom_items_library')
LIBRARY_JSON = os.path.join(LIBRARY_DIR, 'items.json')

BASE_ITEM_COUNT = 327
BASE_L0_LINES = 626

UNIT_MULTIPLIERS = {
    # Subatomic
    'ym': 1e-24, 'yoctometer': 1e-24, 'yoctometers': 1e-24,
    'zm': 1e-21, 'zeptometer': 1e-21, 'zeptometers': 1e-21,
    'am': 1e-18, 'attometer': 1e-18, 'attometers': 1e-18,
    'fm': 1e-15, 'femtometer': 1e-15, 'femtometers': 1e-15,
    'pm': 1e-12, 'picometer': 1e-12, 'picometers': 1e-12,
    'nm': 1e-9,  'nanometer': 1e-9,   'nanometers': 1e-9,
    'um': 1e-6,  'µm': 1e-6, 'μm': 1e-6, 'micrometer': 1e-6, 'micrometers': 1e-6, 'micron': 1e-6, 'microns': 1e-6,
    'mm': 1e-3,  'millimeter': 1e-3, 'millimeters': 1e-3,
    'cm': 1e-2,  'centimeter': 1e-2, 'centimeters': 1e-2,
    'm': 1.0,    'meter': 1.0,       'meters': 1.0,
    'km': 1e3,   'kilometer': 1e3,   'kilometers': 1e3,
    # Astronomical
    'au': 1.495978707e11, 'astronomical unit': 1.495978707e11, 'astronomical units': 1.495978707e11,
    'ly': 9.460730472e15, 'lightyear': 9.460730472e15, 'lightyears': 9.460730472e15,
    'light-year': 9.460730472e15, 'light-years': 9.460730472e15,
    'pc': 3.085677581e16, 'parsec': 3.085677581e16, 'parsecs': 3.085677581e16,
    'kpc': 3.085677581e19, 'kiloparsec': 3.085677581e19, 'kiloparsecs': 3.085677581e19,
    'mpc': 3.085677581e22, 'megaparsec': 3.085677581e22, 'megaparsecs': 3.085677581e22,
    'gpc': 3.085677581e25, 'gigaparsec': 3.085677581e25, 'gigaparsecs': 3.085677581e25
}

def ensure_library_init():
    if not os.path.exists(LIBRARY_DIR):
        os.makedirs(LIBRARY_DIR, exist_ok=True)

    if not os.path.exists(LIBRARY_JSON):
        seed_items = []
        balls_src = os.path.join(ROOT_DIR, 'balls.png')
        if os.path.exists(balls_src):
            target_img = os.path.join(LIBRARY_DIR, '328_cricket_ball.png')
            if not os.path.exists(target_img):
                shutil.copyfile(balls_src, target_img)
            seed_items.append({
                "objectID": 328,
                "title": "cricket ball",
                "description": "its a ballll",
                "exponent": -2.0,
                "coeff": 7.2,
                "cullFac": 1.0,
                "realRatio": 1.0,
                "boundW": 200.0,
                "boundH": 200.0,
                "titleY": -150.0,
                "imageFileName": "328_cricket_ball.png"
            })
        with open(LIBRARY_JSON, 'w', encoding='utf-8') as f:
            json.dump(seed_items, f, indent=2)

def get_library_items():
    ensure_library_init()
    try:
        with open(LIBRARY_JSON, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_library_items(items):
    ensure_library_init()
    with open(LIBRARY_JSON, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2)

def parse_size(size_val=None, unit_name=None, exponent_val=None, coeff_val=None):
    if exponent_val is not None and coeff_val is not None:
        try:
            return float(exponent_val), float(coeff_val)
        except (ValueError, TypeError):
            pass

    if size_val is not None:
        if isinstance(size_val, (int, float)):
            num = float(size_val)
            unit_str = (unit_name or 'm').strip().lower()
        else:
            s = str(size_val).strip()
            sci_match = re.match(r'^(?:10\^([+-]?[0-9]+(?:\.[0-9]+)?)\s*(?:[*xX×]\s*([+-]?[0-9]+(?:\.[0-9]+)?))?)$', s)
            if sci_match:
                exp = float(sci_match.group(1))
                cof = float(sci_match.group(2)) if sci_match.group(2) else 1.0
                return exp, cof

            match = re.match(r'^([+-]?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*(.*)$', s)
            if not match:
                raise ValueError(f"Could not parse size string: {size_val}")
            num = float(match.group(1))
            unit_str = match.group(2).strip().lower()
            if not unit_str and unit_name:
                unit_str = unit_name.strip().lower()
            if not unit_str:
                unit_str = 'm'

        multiplier = UNIT_MULTIPLIERS.get(unit_str)
        if multiplier is None:
            cleaned_unit = unit_str.rstrip('s').lower()
            multiplier = UNIT_MULTIPLIERS.get(cleaned_unit, 1.0)

        meters = num * multiplier
        if meters <= 0:
            raise ValueError("Size must be greater than 0 meters.")

        exponent = math.floor(math.log10(meters))
        coeff = round(meters / (10 ** exponent), 4)
        return float(exponent), float(coeff)

    raise ValueError("No valid size parameters provided.")

def get_next_object_id(items=None):
    if items is None:
        items = get_library_items()
    max_id = BASE_ITEM_COUNT
    for it in items:
        max_id = max(max_id, int(it.get('objectID', BASE_ITEM_COUNT)))
    return max_id + 1

def pack_spritesheets(items):
    if not items:
        empty_img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
        high_json = {
            "frames": {},
            "meta": {"app": "universe_item_manager", "version": "2.0", "image": "new_items_custom.png", "format": "RGBA8888", "size": {"w": 1, "h": 1}, "scale": "1"}
        }
        low_json = {
            "frames": {},
            "meta": {"app": "universe_item_manager", "version": "2.0", "image": "quarter_items_custom.png", "format": "RGBA8888", "size": {"w": 1, "h": 1}, "scale": "0.25"}
        }
        return empty_img, high_json, empty_img, low_json

    high_sprites = []
    low_sprites = []

    for it in items:
        obj_id = str(it['objectID']).zfill(3)
        img_name = it['imageFileName']
        img_path = os.path.join(LIBRARY_DIR, img_name)
        if not os.path.exists(img_path):
            img = Image.new('RGBA', (200, 200), (120, 120, 200, 255))
        else:
            img = Image.open(img_path).convert('RGBA')

        max_dim = 1024
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        high_sprites.append((obj_id, img))

        low_w = max(1, int(img.width * 0.25))
        low_h = max(1, int(img.height * 0.25))
        low_img = img.copy().resize((low_w, low_h), Image.Resampling.LANCZOS)
        low_sprites.append((f"{obj_id}_quarter", low_img))

    def build_atlas(sprite_list, scale_str, image_filename):
        padding = 4
        total_w = sum(img.width + padding for _, img in sprite_list) + padding
        max_h = max(img.height for _, img in sprite_list) + (padding * 2)

        atlas_img = Image.new('RGBA', (total_w, max_h), (0, 0, 0, 0))
        frames_dict = {}

        current_x = padding
        for frame_key, spr_img in sprite_list:
            y = padding
            atlas_img.paste(spr_img, (current_x, y), spr_img)
            frames_dict[frame_key] = {
                "frame": {"x": current_x, "y": y, "w": spr_img.width, "h": spr_img.height},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": spr_img.width, "h": spr_img.height},
                "sourceSize": {"w": spr_img.width, "h": spr_img.height}
            }
            current_x += spr_img.width + padding

        meta_dict = {
            "app": "universe_item_manager",
            "version": "2.0",
            "image": image_filename,
            "format": "RGBA8888",
            "size": {"w": total_w, "h": max_h},
            "scale": scale_str
        }

        return atlas_img, {"frames": frames_dict, "meta": meta_dict}

    high_atlas, high_json = build_atlas(high_sprites, "1", "new_items_custom.png")
    low_atlas, low_json = build_atlas(low_sprites, "0.25", "quarter_items_custom.png")

    return high_atlas, high_json, low_atlas, low_json

def sync_all(items=None):
    if items is None:
        items = get_library_items()

    high_atlas, high_json, low_atlas, low_json = pack_spritesheets(items)

    texture_dirs = [
        os.path.join(ROOT_DIR, 'src', 'img', 'textures'),
        os.path.join(ROOT_DIR, 'sotu-app', 'img', 'textures'),
        os.path.join(ROOT_DIR, 'dist', 'sotu', 'img', 'textures'),
        os.path.join(ROOT_DIR, 'dist', 'img', 'textures'),
        os.path.join(ROOT_DIR, 'dist-site', 'sotu', 'img', 'textures')
    ]

    for tdir in texture_dirs:
        if os.path.exists(os.path.dirname(tdir)):
            os.makedirs(tdir, exist_ok=True)
            high_atlas.save(os.path.join(tdir, 'new_items_custom.png'), format='PNG')
            with open(os.path.join(tdir, 'new_items_custom.json'), 'w', encoding='utf-8') as f:
                json.dump(high_json, f, indent=2)

            low_atlas.save(os.path.join(tdir, 'quarter_items_custom.png'), format='PNG')
            with open(os.path.join(tdir, 'quarter_items_custom.json'), 'w', encoding='utf-8') as f:
                json.dump(low_json, f, indent=2)

    src_sizes_file = os.path.join(ROOT_DIR, 'src', 'data', 'sizes.json')
    with open(src_sizes_file, 'r', encoding='utf-8') as f:
        full_sizes = json.load(f)
    base_sizes = full_sizes[:BASE_ITEM_COUNT]

    custom_sizes = []
    for it in items:
        custom_sizes.append({
            "objectID": int(it["objectID"]),
            "exponent": float(it["exponent"]),
            "coeff": float(it["coeff"]),
            "cullFac": float(it.get("cullFac", 1.0)),
            "realRatio": float(it.get("realRatio", 1.0))
        })
    combined_sizes = base_sizes + custom_sizes

    sizes_paths = [
        os.path.join(ROOT_DIR, 'src', 'data', 'sizes.json'),
        os.path.join(ROOT_DIR, 'sotu-app', 'data', 'sizes.json'),
        os.path.join(ROOT_DIR, 'dist', 'sotu', 'data', 'sizes.json'),
        os.path.join(ROOT_DIR, 'dist', 'data', 'sizes.json'),
        os.path.join(ROOT_DIR, 'dist-site', 'sotu', 'data', 'sizes.json')
    ]
    for sp in sizes_paths:
        if os.path.exists(os.path.dirname(sp)):
            with open(sp, 'w', encoding='utf-8') as f:
                json.dump(combined_sizes, f, indent=2)

    src_vis_file = os.path.join(ROOT_DIR, 'src', 'data', 'visualLocations.json')
    with open(src_vis_file, 'r', encoding='utf-8') as f:
        full_vis = json.load(f)
    base_vis = full_vis[:BASE_ITEM_COUNT]

    custom_vis = []
    for it in items:
        bw = float(it.get("boundW", 200.0))
        bh = float(it.get("boundH", 200.0))
        ty = float(it.get("titleY", -150.0))
        custom_vis.append({
            "objectID": int(it["objectID"]),
            "boundX": -bw / 2.0,
            "boundY": -bh / 2.0,
            "boundW": bw,
            "boundH": bh,
            "titleX": 0,
            "titleY": ty,
            "titleScale": 1,
            "titleWrap": True,
            "descriptionX": 0,
            "descriptionY": 0
        })
    combined_vis = base_vis + custom_vis

    vis_paths = [
        os.path.join(ROOT_DIR, 'src', 'data', 'visualLocations.json'),
        os.path.join(ROOT_DIR, 'sotu-app', 'data', 'visualLocations.json'),
        os.path.join(ROOT_DIR, 'dist', 'sotu', 'data', 'visualLocations.json'),
        os.path.join(ROOT_DIR, 'dist', 'data', 'visualLocations.json'),
        os.path.join(ROOT_DIR, 'dist-site', 'sotu', 'data', 'visualLocations.json')
    ]
    for vp in vis_paths:
        if os.path.exists(os.path.dirname(vp)):
            with open(vp, 'w', encoding='utf-8') as f:
                json.dump(combined_vis, f, indent=2)

    src_l0_file = os.path.join(ROOT_DIR, 'src', 'data', 'languages', 'l0.txt')
    with open(src_l0_file, 'r', encoding='utf-8') as f:
        full_l0 = [line.strip('\r\n') for line in f.readlines()]
    base_l0 = full_l0[:BASE_L0_LINES]

    custom_l0 = []
    for it in items:
        custom_l0.append(it.get("title", ""))
        custom_l0.append(it.get("description", ""))
    combined_l0 = base_l0 + custom_l0

    l0_paths = [
        os.path.join(ROOT_DIR, 'src', 'data', 'languages', 'l0.txt'),
        os.path.join(ROOT_DIR, 'sotu-app', 'data', 'languages', 'l0.txt'),
        os.path.join(ROOT_DIR, 'dist', 'sotu', 'data', 'languages', 'l0.txt'),
        os.path.join(ROOT_DIR, 'dist', 'data', 'languages', 'l0.txt'),
        os.path.join(ROOT_DIR, 'dist-site', 'sotu', 'data', 'languages', 'l0.txt')
    ]
    for lp in l0_paths:
        if os.path.exists(os.path.dirname(lp)):
            with open(lp, 'w', encoding='utf-8') as f:
                f.write('\n'.join(combined_l0))

    universe_ts_file = os.path.join(ROOT_DIR, 'src', 'ts', 'classes', 'universe.ts')
    if os.path.exists(universe_ts_file):
        with open(universe_ts_file, 'r', encoding='utf-8') as f:
            u_code = f.read()

        for it in items:
            title = it.get("title", "").strip()
            if title and f'"{title}"' not in u_code:
                u_code = re.sub(
                    r'(\s*\]\.map\(normalizeTitle\))',
                    f',\n      "{title}"\\1',
                    u_code,
                    count=1
                )
        with open(universe_ts_file, 'w', encoding='utf-8') as f:
            f.write(u_code)

    sotu_bundle = os.path.join(ROOT_DIR, 'sotu-app', 'js', 'bundle.js')
    dist_sotu_bundle = os.path.join(ROOT_DIR, 'dist', 'sotu', 'js', 'bundle.js')
    if os.path.exists(sotu_bundle) and os.path.exists(os.path.dirname(dist_sotu_bundle)):
        shutil.copyfile(sotu_bundle, dist_sotu_bundle)

    return True

def add_custom_item(image_path_or_file, title, description, size_val=None, unit_name=None,
                    exponent_val=None, coeff_val=None, bound_w=200.0, bound_h=200.0, title_y=-150.0):
    ensure_library_init()
    items = get_library_items()

    exponent, coeff = parse_size(size_val, unit_name, exponent_val, coeff_val)
    object_id = get_next_object_id(items)

    file_ext = '.png'
    safe_title = re.sub(r'[^a-zA-Z0-9_]', '_', title.lower())
    dest_filename = f"{object_id}_{safe_title}{file_ext}"
    dest_path = os.path.join(LIBRARY_DIR, dest_filename)

    if isinstance(image_path_or_file, str):
        img = Image.open(image_path_or_file).convert('RGBA')
        img.save(dest_path, format='PNG')
    elif hasattr(image_path_or_file, 'read'):
        img = Image.open(image_path_or_file).convert('RGBA')
        img.save(dest_path, format='PNG')
    else:
        raise ValueError("Invalid image input.")

    new_item = {
        "objectID": object_id,
        "title": title.strip(),
        "description": description.strip(),
        "exponent": float(exponent),
        "coeff": float(coeff),
        "cullFac": 1.0,
        "realRatio": 1.0,
        "boundW": float(bound_w),
        "boundH": float(bound_h),
        "titleY": float(title_y),
        "imageFileName": dest_filename
    }

    items.append(new_item)
    save_library_items(items)
    sync_all(items)

    return new_item

def delete_custom_item(object_id):
    items = get_library_items()
    item_to_delete = None
    new_items = []
    for it in items:
        if it.get("objectID") == object_id:
            item_to_delete = it
        else:
            new_items.append(it)

    if item_to_delete:
        img_path = os.path.join(LIBRARY_DIR, item_to_delete.get("imageFileName", ""))
        if os.path.exists(img_path):
            try:
                os.remove(img_path)
            except Exception:
                pass
        save_library_items(new_items)
        sync_all(new_items)
        return True
    return False

if __name__ == '__main__':
    ensure_library_init()
    sync_all()
    print('Item manager initialized and synced successfully!')
