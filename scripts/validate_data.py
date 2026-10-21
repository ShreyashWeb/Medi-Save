#!/usr/bin/env python3
"""
Data validator for MediSave.

Validates brand medicines in data/brands.csv against cleaned Jan Aushadhi generics.

Fails with a clear message if:
1. A brand row lacks source_url.
2. A brand row lacks source_date.
3. ja_code does not exist in generics list.
4. Linked generic has parse_ok=false or price_listed=false.
5. Brand and generic disagree on molecules, strengths, or form.
6. brand_mrp is not positive.
7. pack_count is not positive.
8. A brand_id is duplicated.
"""

import sys
import os
import re
import csv
import pandas as pd

# Ensure repository root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


class ValidationError(Exception):
    """Raised when data validation fails."""
    pass


def normalise_item_list(val: str) -> list[str]:
    """Parse semicolon- or comma-separated string into sorted lowercase token list."""
    if not val or pd.isna(val):
        return []
    val_str = str(val).strip().lower()
    if ';' in val_str:
        tokens = [t.strip() for t in val_str.split(';')]
    elif ',' in val_str:
        tokens = [t.strip() for t in val_str.split(',')]
    else:
        tokens = [val_str]
    return [t for t in tokens if t]


def validate_brands(brands_df: pd.DataFrame, generics_df: pd.DataFrame) -> tuple[bool, list[str]]:
    """
    Validate brands DataFrame against generics DataFrame.
    Returns (is_valid: bool, errors: list[str]).
    """
    errors = []

    # Map generics by ja_code
    generics_map = {}
    for _, g in generics_df.iterrows():
        try:
            code = int(float(g['ja_code']))
            generics_map[code] = g
        except (ValueError, TypeError):
            continue

    seen_brand_ids = set()

    for idx, row in brands_df.iterrows():
        row_num = idx + 2  # 1-indexed line in CSV (header is line 1)
        brand_id = str(row.get('brand_id', '')).strip()
        brand_name = str(row.get('brand_name', '')).strip()

        # Rule 8: brand_id duplicated
        if not brand_id:
            errors.append(f"Row {row_num}: 'brand_id' is empty.")
        elif brand_id in seen_brand_ids:
            errors.append(f"Row {row_num}: Duplicate 'brand_id' '{brand_id}'.")
        else:
            seen_brand_ids.add(brand_id)

        # Rule 1: source_url missing
        source_url = str(row.get('source_url', '')).strip()
        if not source_url or pd.isna(row.get('source_url')):
            errors.append(f"Row {row_num} ('{brand_id}'): Missing required 'source_url'.")

        # Rule 2: source_date missing
        source_date = str(row.get('source_date', '')).strip()
        if not source_date or pd.isna(row.get('source_date')):
            errors.append(f"Row {row_num} ('{brand_id}'): Missing required 'source_date'.")

        # Rule 6: brand_mrp not positive
        raw_mrp = row.get('brand_mrp')
        try:
            mrp_val = float(str(raw_mrp).replace(',', '').strip())
            if mrp_val <= 0:
                errors.append(f"Row {row_num} ('{brand_id}'): 'brand_mrp' must be positive, got {raw_mrp}.")
        except (ValueError, TypeError):
            errors.append(f"Row {row_num} ('{brand_id}'): 'brand_mrp' is invalid or not numeric: '{raw_mrp}'.")

        # Rule 7: pack_count not positive
        raw_pack = row.get('pack_count')
        try:
            pack_val = int(float(str(raw_pack).strip()))
            if pack_val <= 0:
                errors.append(f"Row {row_num} ('{brand_id}'): 'pack_count' must be positive, got {raw_pack}.")
        except (ValueError, TypeError):
            errors.append(f"Row {row_num} ('{brand_id}'): 'pack_count' is invalid or not an integer: '{raw_pack}'.")

        # Rule 3: ja_code does not exist
        raw_ja_code = row.get('ja_code')
        try:
            ja_code = int(float(str(raw_ja_code).strip()))
        except (ValueError, TypeError):
            ja_code = None

        if ja_code is None or ja_code not in generics_map:
            errors.append(f"Row {row_num} ('{brand_id}'): 'ja_code' {raw_ja_code} does not exist in Jan Aushadhi generic list.")
            continue

        linked_gen = generics_map[ja_code]

        # Rule 4: linked generic has parse_ok=false or price_listed=false
        gen_parse_ok = str(linked_gen.get('parse_ok', '')).strip().lower() == 'true'
        gen_price_listed = str(linked_gen.get('price_listed', '')).strip().lower() == 'true'

        if not gen_parse_ok:
            errors.append(f"Row {row_num} ('{brand_id}'): Linked generic ja_code {ja_code} has parse_ok=false.")
        if not gen_price_listed:
            errors.append(f"Row {row_num} ('{brand_id}'): Linked generic ja_code {ja_code} has price_listed=false.")

        # Rule 5: brand and generic disagree on form, molecules, or strengths
        b_form = str(row.get('form', '')).strip().lower()
        g_form = str(linked_gen.get('form', '')).strip().lower()
        if b_form != g_form:
            errors.append(f"Row {row_num} ('{brand_id}'): Form mismatch: brand has '{b_form}', generic {ja_code} has '{g_form}'.")

        b_mols = normalise_item_list(row.get('molecules', ''))
        g_mols = normalise_item_list(linked_gen.get('molecules', ''))
        if sorted(b_mols) != sorted(g_mols):
            errors.append(f"Row {row_num} ('{brand_id}'): Molecules mismatch: brand has {b_mols}, generic {ja_code} has {g_mols}.")

        b_strengths = normalise_item_list(row.get('strengths', ''))
        g_strengths = normalise_item_list(linked_gen.get('strengths', ''))
        if sorted(b_strengths) != sorted(g_strengths):
            errors.append(f"Row {row_num} ('{brand_id}'): Strengths mismatch: brand has {b_strengths}, generic {ja_code} has {g_strengths}.")

    is_valid = (len(errors) == 0)
    return is_valid, errors


def validate_files(brands_csv_path: str, generics_csv_path: str):
    """Load CSVs and validate brand data."""
    if not os.path.exists(brands_csv_path):
        raise FileNotFoundError(f"Brands file not found: {brands_csv_path}")
    if not os.path.exists(generics_csv_path):
        raise FileNotFoundError(f"Generics file not found: {generics_csv_path}")

    brands_df = pd.read_csv(brands_csv_path, dtype=str)
    generics_df = pd.read_csv(generics_csv_path, dtype=str)

    # Empty rows (if header only)
    if len(brands_df) == 0:
        print(f"Validation successful: '{brands_csv_path}' has 0 rows (header-only).")
        return True

    is_valid, errors = validate_brands(brands_df, generics_df)

    if not is_valid:
        print("==================================================")
        print("VALIDATION FAILED WITH ERRORS:")
        print("==================================================")
        for err in errors:
            print(f"  [ERROR] {err}")
        print(f"Total validation errors: {len(errors)}")
        raise ValidationError(f"Data validation failed with {len(errors)} errors.")

    print(f"Validation successful: all {len(brands_df)} brand rows passed all checks.")
    return True


if __name__ == "__main__":
    b_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE_DIR, "data", "brands.csv")
    g_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE_DIR, "data", "clean", "jan_aushadhi_clean.csv")

    try:
        validate_files(b_path, g_path)
        sys.exit(0)
    except ValidationError:
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
