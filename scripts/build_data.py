#!/usr/bin/env python3
"""
Build application JSON data files for MediSave.

Outputs:
- public/data/generics.json: eligible generic medicines (is_consumable=false, parse_ok=true)
- public/data/brands.json: validated brand rows with data_date = newest source_date

Rule: Runs the validator first and halts immediately if validation fails.
Rule: No field may hold a price of 0.
"""

import sys
import os
import json
import math
import pandas as pd

# Ensure repository root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scripts.validate_data import validate_files, normalise_item_list, ValidationError


def build_app_data(brands_csv_path: str, clean_ja_csv_path: str, output_dir: str):
    """Run validator, process data, and output generics.json and brands.json."""
    print("==================================================")
    print("STEP 1: RUNNING DATA VALIDATOR")
    print("==================================================")
    try:
        validate_files(brands_csv_path, clean_ja_csv_path)
    except ValidationError as e:
        print(f"\nFATAL: Build aborted because validator failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nFATAL: Unexpected validator error: {e}")
        sys.exit(1)

    print("\n==================================================")
    print("STEP 2: BUILDING PUBLIC APP DATA")
    print("==================================================")

    os.makedirs(output_dir, exist_ok=True)

    # 1. Build public/data/generics.json
    df_ja = pd.read_csv(clean_ja_csv_path, dtype=str)
    # Filter: is_consumable=false and parse_ok=true only
    eligible_ja = df_ja[
        (df_ja['is_consumable'].str.lower() == 'false') &
        (df_ja['parse_ok'].str.lower() == 'true')
    ]

    generics_list = []
    for _, r in eligible_ja.iterrows():
        mols = normalise_item_list(r.get('molecules', ''))
        sts = normalise_item_list(r.get('strengths', ''))

        pack_cnt = None
        raw_pack = str(r.get('pack_count', '')).strip()
        if raw_pack and raw_pack.lower() not in ('nan', 'none', ''):
            try:
                p_val = int(float(raw_pack))
                if p_val > 0:
                    pack_cnt = p_val
            except (ValueError, TypeError):
                pack_cnt = None

        mrp_val = None
        raw_mrp = str(r.get('ja_mrp', '')).strip()
        if raw_mrp and raw_mrp.lower() not in ('nan', 'none', ''):
            try:
                val = float(raw_mrp)
                if val > 0 and not math.isnan(val):
                    mrp_val = val
            except (ValueError, TypeError):
                mrp_val = None

        ppu_val = None
        raw_ppu = str(r.get('price_per_unit', '')).strip()
        if raw_ppu and raw_ppu.lower() not in ('nan', 'none', ''):
            try:
                val = float(raw_ppu)
                if val > 0 and not math.isnan(val):
                    ppu_val = val
            except (ValueError, TypeError):
                ppu_val = None

        item = {
            'ja_code': int(float(r['ja_code'])),
            'raw_name': str(r['raw_name']),
            'molecules': mols,
            'strengths': sts,
            'form': str(r.get('form', '')),
            'unit_size': str(r.get('unit_size', '')),
            'pack_count': pack_cnt,
            'ja_mrp': mrp_val,
            'price_listed': True,
            'price_per_unit': ppu_val,
            'group': str(r.get('group', '')),
            'is_consumable': False,
            'parse_ok': True
        }
        generics_list.append(item)

    generics_json_path = os.path.join(output_dir, "generics.json")
    with open(generics_json_path, "w", encoding="utf-8") as f:
        json.dump(generics_list, f, indent=2, ensure_ascii=False, allow_nan=False)

    # 2. Build public/data/brands.json
    df_brands = pd.read_csv(brands_csv_path, dtype=str)
    source_dates = [
        str(d).strip() for d in df_brands['source_date']
        if str(d).strip() and not pd.isna(d)
    ] if len(df_brands) > 0 and 'source_date' in df_brands.columns else []

    newest_source_date = max(source_dates) if source_dates else ""

    brands_list = []
    for _, r in df_brands.iterrows():
        mols = normalise_item_list(r.get('molecules', ''))
        sts = normalise_item_list(r.get('strengths', ''))
        aliases = normalise_item_list(r.get('aliases', ''))

        pack_cnt = int(float(str(r['pack_count']).strip()))
        mrp_val = float(str(r['brand_mrp']).strip())
        if mrp_val <= 0:
            mrp_val = None

        item = {
            'brand_id': str(r['brand_id']).strip(),
            'brand_name': str(r['brand_name']).strip(),
            'manufacturer': str(r.get('manufacturer', '')).strip(),
            'molecules': mols,
            'strengths': sts,
            'form': str(r.get('form', '')).strip(),
            'pack_count': pack_cnt,
            'brand_mrp': mrp_val,
            'source_url': str(r.get('source_url', '')).strip(),
            'source_date': str(r.get('source_date', '')).strip(),
            'ja_code': int(float(r['ja_code'])),
            'aliases': aliases,
            'data_date': newest_source_date
        }
        brands_list.append(item)

    brands_json_path = os.path.join(output_dir, "brands.json")
    with open(brands_json_path, "w", encoding="utf-8") as f:
        json.dump(brands_list, f, indent=2, ensure_ascii=False, allow_nan=False)

    # Report sizes and counts
    generics_size = os.path.getsize(generics_json_path)
    brands_size = os.path.getsize(brands_json_path)

    print("--------------------------------------------------")
    print(f"Generated: {generics_json_path}")
    print(f"  Rows: {len(generics_list)}")
    print(f"  Size: {generics_size:,} bytes ({generics_size / 1024:.2f} KB)")
    print(f"Generated: {brands_json_path}")
    print(f"  Rows: {len(brands_list)}")
    print(f"  Size: {brands_size:,} bytes ({brands_size / 1024:.2f} KB)")
    print(f"  data_date: '{newest_source_date}'")
    print("==================================================")

    return len(generics_list), generics_size, len(brands_list), brands_size


if __name__ == "__main__":
    b_csv = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE_DIR, "data", "brands.csv")
    g_csv = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE_DIR, "data", "clean", "jan_aushadhi_clean.csv")
    out_dir = sys.argv[3] if len(sys.argv) > 3 else os.path.join(BASE_DIR, "public", "data")

    build_app_data(b_csv, g_csv, out_dir)
