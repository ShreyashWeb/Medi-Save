#!/usr/bin/env python3
"""
Prepare brand candidates from staging and raw documents (suggestions only).

Output: data/staging/brand_candidates.csv
Columns:
brand_name, molecules, strengths, form, pack_count, price, price_basis,
source_file, source_page, suggested_ja_code, match_basis, human_confirmed
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

from scripts.clean_jan_aushadhi import (
    parse_generic_name,
    normalise_strength,
    clean_molecule_text,
    FORM_MAPPING,
    STRENGTH_TOKEN
)


def load_jan_aushadhi_index(clean_ja_path):
    """
    Index cleaned Jan Aushadhi rows by (form, molecules, strengths).
    Only considers rows that are eligible for matching (is_consumable=false and parse_ok=true).
    """
    if not os.path.exists(clean_ja_path):
        print(f"Warning: {clean_ja_path} not found. No suggestions will be matched.")
        return {}

    df_ja = pd.read_csv(clean_ja_path, dtype=str)
    # Filter eligible rows
    eligible = df_ja[(df_ja['parse_ok'].str.lower() == 'true') & (df_ja['is_consumable'].str.lower() == 'false')]

    ja_index = {}
    for _, r in eligible.iterrows():
        f = str(r.get('form', '')).strip().lower()
        m = str(r.get('molecules', '')).strip().lower()
        s = str(r.get('strengths', '')).strip().lower()
        key = (f, m, s)
        if key not in ja_index:
            ja_index[key] = []
        try:
            ja_code = int(float(r['ja_code']))
            ja_index[key].append(ja_code)
        except (ValueError, TypeError):
            continue

    return ja_index


def prepare_candidates(clean_ja_path, raw_dir, staging_dir, output_csv_path):
    """Build candidate rows from NPPA ceiling lists and staging files."""
    ja_index = load_jan_aushadhi_index(clean_ja_path)
    candidates = []

    # 1. Process All Drugs Ceiling Prices.csv
    nppa_raw_csv = os.path.join(raw_dir, "All Drugs Ceiling Prices.csv")
    if os.path.exists(nppa_raw_csv):
        df_nppa = pd.read_csv(nppa_raw_csv, skiprows=4)
        df_nppa = df_nppa.loc[:, ~df_nppa.columns.str.contains('^Unnamed')]
        df_nppa.columns = [c.strip() for c in df_nppa.columns]
        price_cols = [c for c in df_nppa.columns if 'Ceiling Price' in c]
        price_col = price_cols[0] if price_cols else None

        for _, r in df_nppa.iterrows():
            formulation = str(r.get('Formulation', '')).strip()
            dosage_str = str(r.get('Dosage & Strength', '')).strip()
            if not formulation or formulation == 'Formulation':
                continue

            price_raw = str(r.get(price_col, '')).strip() if price_col else ""
            p_clean = price_raw.replace('₹', '').replace(',', '').strip()
            if '(' in p_clean:
                p_clean = p_clean.split('(')[0].strip()
            try:
                price_val = f"{float(p_clean):.2f}"
            except (ValueError, TypeError):
                price_val = ""

            combined = f"{formulation} {dosage_str}"
            form, mols, sts = parse_generic_name(combined)
            if not form or not mols or not sts:
                form = None
                for pat, f_std in FORM_MAPPING:
                    if re.search(pat, dosage_str, re.IGNORECASE):
                        form = f_std
                        break
                mols = [clean_molecule_text(formulation)] if clean_molecule_text(formulation) else []
                sts_matches = re.findall(STRENGTH_TOKEN, dosage_str, re.IGNORECASE)
                sts = [normalise_strength(s) for s in sts_matches] if sts_matches else []

            form_val = form or ""
            mols_val = ";".join(mols)
            sts_val = ";".join(sts)

            # Match lookup
            key = (form_val.lower(), mols_val.lower(), sts_val.lower())
            matched_codes = ja_index.get(key, [])
            if len(matched_codes) == 1:
                suggested_ja = str(matched_codes[0])
                match_basis = "exact_match_form_molecules_strengths"
            else:
                suggested_ja = ""
                match_basis = ""

            candidates.append({
                'brand_name': formulation,
                'molecules': mols_val,
                'strengths': sts_val,
                'form': form_val,
                'pack_count': "1",
                'price': price_val,
                'price_basis': "NPPA ceiling per unit before GST",
                'source_file': "All Drugs Ceiling Prices.csv",
                'source_page': "",
                'suggested_ja_code': suggested_ja,
                'match_basis': match_basis,
                'human_confirmed': "no"
            })

    # 2. Process Overcharging cases from staging (where price basis is unknown)
    overcharging_csv = os.path.join(staging_dir, "b-status-of-overcharging-cases-upto-march-2026-a14044926da64a8d44a8e9ca865f78d1.csv")
    if os.path.exists(overcharging_csv):
        df_oc = pd.read_csv(overcharging_csv, dtype=str)
        for _, r in df_oc.iterrows():
            formulation = str(r.get('Name of the Formulation', '')).strip()
            if not formulation or formulation == 'Name of the Formulation':
                continue
            company = str(r.get('Name of Company', '')).strip()
            b_name = f"{formulation} ({company})" if company else formulation

            form, mols, sts = parse_generic_name(formulation)
            if not form:
                mols = [clean_molecule_text(formulation)] if clean_molecule_text(formulation) else []
                sts = []

            form_val = form or ""
            mols_val = ";".join(mols)
            sts_val = ";".join(sts)

            key = (form_val.lower(), mols_val.lower(), sts_val.lower())
            matched_codes = ja_index.get(key, [])
            if len(matched_codes) == 1:
                suggested_ja = str(matched_codes[0])
                match_basis = "exact_match_form_molecules_strengths"
            else:
                suggested_ja = ""
                match_basis = ""

            candidates.append({
                'brand_name': b_name,
                'molecules': mols_val,
                'strengths': sts_val,
                'form': form_val,
                'pack_count': "",
                'price': "",
                'price_basis': "unknown",
                'source_file': "b-status-of-overcharging-cases-upto-march-2026-a14044926da64a8d44a8e9ca865f78d1.pdf",
                'source_page': str(r.get('source_page', '')),
                'suggested_ja_code': suggested_ja,
                'match_basis': match_basis,
                'human_confirmed': "no"
            })

    # Output to staging/brand_candidates.csv
    fieldnames = [
        'brand_name', 'molecules', 'strengths', 'form', 'pack_count',
        'price', 'price_basis', 'source_file', 'source_page',
        'suggested_ja_code', 'match_basis', 'human_confirmed'
    ]

    os.makedirs(os.path.dirname(os.path.abspath(output_csv_path)), exist_ok=True)
    out_df = pd.DataFrame(candidates)
    out_df.to_csv(output_csv_path, index=False, columns=fieldnames, quoting=csv.QUOTE_MINIMAL)

    with_suggestion = (out_df['suggested_ja_code'] != '').sum()
    without_suggestion = (out_df['suggested_ja_code'] == '').sum()
    unknown_basis = (out_df['price_basis'] == 'unknown').sum()

    print("==================================================")
    print("BRAND CANDIDATES REPORT")
    print("==================================================")
    print(f"Total candidates:    {len(out_df)}")
    print(f"With suggestion:     {with_suggestion}")
    print(f"Without suggestion:  {without_suggestion}")
    print(f"Unknown basis:       {unknown_basis}")

    return len(out_df), with_suggestion, without_suggestion, unknown_basis


if __name__ == "__main__":
    clean_ja = os.path.join(BASE_DIR, "data", "clean", "jan_aushadhi_clean.csv")
    raw_d = os.path.join(BASE_DIR, "data", "raw")
    staging_d = os.path.join(BASE_DIR, "data", "staging")
    out_csv = os.path.join(staging_d, "brand_candidates.csv")

    prepare_candidates(clean_ja, raw_d, staging_d, out_csv)
