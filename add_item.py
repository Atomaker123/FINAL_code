#!/usr/bin/env python3
"""
add_item.py — Command Line Interface to add items into Scale of the Universe 2.

Usage (Interactive mode):
    python add_item.py

Usage (CLI arguments mode):
    python add_item.py --image path/to/image.png --title "My Galaxy" --desc "An epic spiral galaxy" --size "100000 ly"
    python add_item.py --image balls.png --title "Tennis Ball" --desc "A yellow ball" --exp -1 --coeff 6.7
"""

import os
import sys
import argparse

# Add scripts directory to module search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))
import universe_item_manager as mgr

def main():
    parser = argparse.ArgumentParser(description="Add a custom item to Scale of the Universe 2")
    parser.add_argument('--image', '-i', type=str, help='Path to item image file (PNG, JPG, WEBP, etc.)')
    parser.add_argument('--title', '-t', type=str, help='Title/Name of the item')
    parser.add_argument('--desc', '-d', type=str, help='Description of the item', default='')
    parser.add_argument('--size', '-s', type=str, help='Size string with unit (e.g. "15 cm", "2.5 m", "100 nm", "4.3 ly")')
    parser.add_argument('--exp', type=float, help='Size exponent (power of 10 in meters)')
    parser.add_argument('--coeff', type=float, help='Size coefficient (default 1.0)', default=1.0)
    parser.add_argument('--unit', '-u', type=str, help='Unit if size value is just a number (e.g. cm, m, km, ly)')
    parser.add_argument('--width', type=float, help='Clickable boundary width in pixels (default 200)', default=200.0)
    parser.add_argument('--height', type=float, help='Clickable boundary height in pixels (default 200)', default=200.0)
    parser.add_argument('--title-y', type=float, help='Title Y offset in pixels (default -150)', default=-150.0)
    parser.add_argument('--list', action='store_true', help='List all existing custom items')
    parser.add_argument('--delete', type=int, help='Delete custom item by objectID')
    parser.add_argument('--sync', action='store_true', help='Re-sync all data files and spritesheets')

    args = parser.parse_args()

    if args.list:
        items = mgr.get_library_items()
        print(f"\n=== Custom Items Library ({len(items)} items) ===")
        for it in items:
            print(f"  [ID {it['objectID']}] {it['title']} — 10^{it['exponent']} * {it['coeff']} m ({it.get('imageFileName', '')})")
        print()
        return

    if args.delete:
        ok = mgr.delete_custom_item(args.delete)
        if ok:
            print(f"\n[SUCCESS] Item objectID {args.delete} was removed and universe resynced!\n")
        else:
            print(f"\n[ERROR] Item objectID {args.delete} not found.\n")
        return

    if args.sync:
        mgr.sync_all()
        print("\n[SUCCESS] All data files and custom spritesheets resynced!\n")
        return

    # Interactive mode if arguments are missing
    if not args.image or not args.title:
        print("")
        print("============================================================")
        print("   Scale of the Universe 2 — Add Custom Item Tool           ")
        print("============================================================")
        print("")

        image_path = input("1. Path to image file (PNG, JPG, WEBP): ").strip().strip('"\'')
        while not os.path.exists(image_path):
            print(f"   [!] File not found: {image_path}")
            image_path = input("   Please enter a valid image file path: ").strip().strip('"\'')

        title = input("2. Item Title (e.g. \"James Webb Telescope\"): ").strip()
        while not title:
            title = input("   Title cannot be empty. Enter title: ").strip()

        description = input("3. Item Description: ").strip()

        print("\n4. Real-world Size:")
        print("   You can enter size in natural units (e.g. '15 cm', '2.5 m', '100 nm', '4.3 ly')")
        print("   or type 'exp' to specify scientific exponent & coefficient.")
        size_input = input("   Enter size: ").strip()

        if size_input.lower() == 'exp':
            exponent_val = float(input("   Size exponent (power of 10): ").strip())
            coeff_val = float(input("   Size coefficient (e.g. 1.5): ").strip() or '1')
            size_val = None
            unit_name = None
        else:
            size_val = size_input
            exponent_val = None
            coeff_val = None
            unit_name = None

        print("\n5. Layout & Hitbox (Press Enter for defaults):")
        bw_str = input("   Clickable Width (default 200): ").strip()
        bh_str = input("   Clickable Height (default 200): ").strip()
        ty_str = input("   Title Y Offset (default -150): ").strip()

        bound_w = float(bw_str) if bw_str else 200.0
        bound_h = float(bh_str) if bh_str else 200.0
        title_y = float(ty_str) if ty_str else -150.0

        item = mgr.add_custom_item(
            image_path_or_file=image_path,
            title=title,
            description=description,
            size_val=size_val,
            unit_name=unit_name,
            exponent_val=exponent_val,
            coeff_val=coeff_val,
            bound_w=bound_w,
            bound_h=bound_h,
            title_y=title_y
        )
    else:
        # Command line arguments provided
        item = mgr.add_custom_item(
            image_path_or_file=args.image,
            title=args.title,
            description=args.desc,
            size_val=args.size,
            unit_name=args.unit,
            exponent_val=args.exp,
            coeff_val=args.coeff,
            bound_w=args.width,
            bound_h=args.height,
            title_y=args.title_y
        )

    print("")
    print("============================================================")
    print("   [SUCCESS] Item Added to Scale of the Universe!           ")
    print("============================================================")
    print(f"  Title:       {item['title']}")
    print(f"  Object ID:   {item['objectID']}")
    print(f"  Size:        10^{item['exponent']} * {item['coeff']} meters")
    print(f"  Description: {item['description']}")
    print(f"  Image:       {item['imageFileName']}")
    print("")
    print("  The item is now live in Scale of the Universe!")
    print("  Open http://localhost:3000/sotu/ to view your universe.")
    print("============================================================\n")

if __name__ == '__main__':
    main()
