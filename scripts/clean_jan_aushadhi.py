#!/usr/bin/env python3
"""
Clean and parse the raw Jan Aushadhi product list CSV.

Output columns:
ja_code, raw_name, unit_size, ja_mrp, group, form, molecules,
strengths, pack_count, price_per_unit, price_listed, is_consumable, parse_ok
"""

import sys
import os
import re
import csv
import random
import pandas as pd

# Form mapping: regex pattern -> canonical dosage form
FORM_MAPPING = [
    (r'\b(dispersible\s+tablets?|chewable\s+tablets?|mouth\s+dissolving\s+tablets?|orodispersible\s+tablets?|sublingual\s+tablets?|enteric\s+coated\s+tablets?|gastro[- ]resistant\s+tablets?|prolonged[- ]release\s+tablets?|sustained[- ]release\s+tablets?|extended[- ]release\s+tablets?|film\s+coated\s+tablets?|sugar\s+coated\s+tablets?|tabelts?|tablets?|tablet|tab)\b', 'tablet'),
    (r'\b(gastro[- ]resistant\s+capsules?|delayed[- ]release\s+capsules?|hard\s+gelatin\s+capsules?|soft\s+gelatin\s+capsules?|extended[- ]release\s+capsules?|capulses?|capsules?|capsule|cap)\b', 'capsule'),
    (r'\b(powder\s+for\s+injection|injections?|injection|inj)\b', 'injection'),
    (r'\b(eye/ear\s+drops?|eye\s+drops?|ear\s+drops?|nasal\s+drops?|oral\s+drops?|drops?|eye\s+drop|ear\s+drop)\b', 'drops'),
    (r'\b(oral\s+suspension|suspension)\b', 'suspension'),
    (r'\b(syrup)\b', 'syrup'),
    (r'\b(ointment)\b', 'ointment'),
    (r'\b(cream)\b', 'cream'),
    (r'\b(gel)\b', 'gel'),
    (r'\b(lotion)\b', 'lotion'),
    (r'\b(dusting\s+powder|powder\s+for\s+oral\s+suspension|oral\s+powder|powder)\b', 'powder'),
    (r'\b(rotacaps?|respules?|inhalation)\b', 'inhalation'),
    (r'\b(nasal\s+spray|spray)\b', 'spray'),
    (r'\b(mouthwash|gargle)\b', 'mouthwash'),
    (r'\b(infusion|iv\s+fluid)\b', 'infusion'),
    (r'\b(oral\s+solution|solution)\b', 'solution'),
    (r'\b(granules|sachet)\b', 'granules'),
]

# Modifiers and pharmacopoeia references to strip from molecule strings
STRIP_PATTERNS = [
    r'\b(IP|BP|USP)\b',
    r'\b(prolonged[- ]release|sustained[- ]release|extended[- ]release|modified[- ]release|controlled[- ]release|delayed[- ]release|gastro[- ]resistant|enteric[- ]coated|film[- ]coated|sugar[- ]coated|mouth[- ]dissolving|orodispersible|dispersible|chewable|paediatric)\b',
    r'\b(tablets?|capsules?|injection|drops?|suspension|syrup|ointment|cream|gel|lotion|powder|inhalation|rotacaps?|respules?|spray|mouthwash|solution|granules)\b',
    r'\b(er|pr|sr|cr|xr|mr)\b',
    r'\b(oral)\b',
]

# Regex for strength token matching (including concentrations like '125mg/5ml', '25mg per ml', '% w/w', etc.)
STRENGTH_TOKEN = r'(\d+(?:\.\d+)?\s*(?:%\s*w/w|%\s*w/v|%\s*v/v|%|mg|mcg|gm|g|iu/ml|iu/g|iu|ml|mEq)(?:\s*(?:per|/)\s*\d*(?:\.\d+)?\s*ml)?)\b'


def normalise_strength(s: str) -> str:
    """Normalise strength string: lower-case, collapse whitespace, format units."""
    if not s:
        return ""
    s = s.strip().lower()
    s = re.sub(r'\s+per\s+', '/', s)
    s = re.sub(r'\s+', '', s)
    s = re.sub(r'%(w/w|w/v|v/v)', r'% \1', s)
    return s


def clean_molecule_text(text: str):
    """Strip form/strength/pharmacopoeia residues and clean molecule name."""
    if not text:
        return None
    for p in STRIP_PATTERNS:
        text = re.sub(p, ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'[\(\)\[\],]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower() if text else None


def parse_generic_name(raw_name: str):
    """
    Parse generic drug name into (form, molecules, strengths).
    Returns (form: str or None, molecules: list[str], strengths: list[str]).
    """
    form = None
    form_match_span = None
    for pattern, std_form in FORM_MAPPING:
        m = re.search(pattern, raw_name, re.IGNORECASE)
        if m:
            form = std_form
            form_match_span = m.span()
            break

    if not form:
        return None, [], []

    # Case 1: Slash strength in parentheses e.g. "Atenolol + Nifedipine Tablet (50/20 Mg)"
    slash_match = re.search(r'\(([\d\.]+)\s*/\s*([\d\.]+)(?:\s*/\s*([\d\.]+))?\s*([a-zA-Z]+)?\)', raw_name)
    if slash_match:
        unit = slash_match.group(4) or 'mg'
        s1 = normalise_strength(f"{slash_match.group(1)}{unit}")
        s2 = normalise_strength(f"{slash_match.group(2)}{unit}")
        strengths = [s1, s2]
        if slash_match.group(3):
            strengths.append(normalise_strength(f"{slash_match.group(3)}{unit}"))

        name_part = raw_name[:slash_match.start()]
        if form_match_span:
            name_part = raw_name[:form_match_span[0]]

        mol_parts = re.split(r'\s*(?:\+|\band\b)\s*', name_part, flags=re.IGNORECASE)
        molecules = [clean_molecule_text(p) for p in mol_parts if clean_molecule_text(p)]
        if len(molecules) == len(strengths):
            return form, molecules, strengths

    # Case 2: Combination drugs with inline strengths
    all_strengths = re.findall(STRENGTH_TOKEN, raw_name, re.IGNORECASE)
    if len(all_strengths) > 1:
        before_form = raw_name[:form_match_span[0]] if form_match_span else raw_name
        parts = re.split(r'\s*(?:\band\b|\+|,)\s*', before_form, flags=re.IGNORECASE)
        molecules = []
        strengths = []
        for part in parts:
            part = part.strip()
            if not part:
                continue
            st_m = re.search(STRENGTH_TOKEN, part, re.IGNORECASE)
            if st_m:
                st = normalise_strength(st_m.group(1))
                mol_text = part[:st_m.start()] + part[st_m.end():]
                mol = clean_molecule_text(mol_text)
                if mol:
                    molecules.append(mol)
                    strengths.append(st)
        if len(molecules) > 0 and len(molecules) == len(strengths):
            return form, molecules, strengths

        # Alternative combination: multiple molecules separated by + or and, strengths at end
        mols_raw = re.split(r'\s*(?:\band\b|\+|,)\s*', before_form, flags=re.IGNORECASE)
        mols = [clean_molecule_text(m) for m in mols_raw if clean_molecule_text(m)]
        if len(mols) == len(all_strengths):
            return form, mols, [normalise_strength(s) for s in all_strengths]

    # Case 3: Single drug with one strength
    if len(all_strengths) == 1:
        st = normalise_strength(all_strengths[0])
        mol_text = raw_name
        for pattern, _ in FORM_MAPPING:
            mol_text = re.sub(pattern, ' ', mol_text, flags=re.IGNORECASE)
        mol_text = re.sub(STRENGTH_TOKEN, ' ', mol_text, flags=re.IGNORECASE)
        mol = clean_molecule_text(mol_text)
        if mol:
            return form, [mol], [st]

    return form, [], []


def parse_row(row_dict: dict) -> dict:
    """Parse a single raw row dictionary into the clean schema."""
    ja_code = int(row_dict.get('Drug Code', 0))
    raw_name = str(row_dict.get('Generic Name', '')).strip()
    unit_size = str(row_dict.get('Unit Size', '')).strip()
    group = str(row_dict.get('Group Name', '')).strip()

    # Parse MRP
    raw_mrp = str(row_dict.get('MRP', '')).replace(',', '').strip()
    try:
        mrp_float = float(raw_mrp)
    except (ValueError, TypeError):
        mrp_float = 0.0

    # Rule: MRP <= 0 becomes empty and price_listed=false
    if mrp_float > 0:
        ja_mrp_str = f"{mrp_float:.2f}"
        price_listed = True
    else:
        ja_mrp_str = ""
        price_listed = False

    # Rule: is_consumable for "Surgical & Medical Consumables" group
    is_consumable = (group == "Surgical & Medical Consumables")

    # Rule: pack_count only for count-style unit sizes (e.g. 10's, 14's, 1's)
    pack_match = re.search(r"(\d+)'s", unit_size, re.IGNORECASE)
    pack_count = int(pack_match.group(1)) if pack_match else None
    pack_count_str = str(pack_count) if pack_count is not None else ""

    # Rule: price_per_unit = ja_mrp / pack_count
    if price_listed and pack_count is not None and pack_count > 0:
        price_per_unit = round(mrp_float / pack_count, 4)
        price_per_unit_str = f"{price_per_unit:.4f}".rstrip('0').rstrip('.')
    else:
        price_per_unit_str = ""

    # Consumables do not have medicines/strengths parsed
    if is_consumable:
        form = ""
        molecules = []
        strengths = []
    else:
        form, molecules, strengths = parse_generic_name(raw_name)
        form = form or ""

    # Rule: parse_ok only if form, molecules, strengths and price are all present
    has_form = bool(form)
    has_molecules = len(molecules) > 0
    has_strengths = len(strengths) > 0 and len(strengths) == len(molecules)
    parse_ok = (not is_consumable) and price_listed and has_form and has_molecules and has_strengths

    return {
        'ja_code': ja_code,
        'raw_name': raw_name,
        'unit_size': unit_size,
        'ja_mrp': ja_mrp_str,
        'group': group,
        'form': form,
        'molecules': ";".join(molecules),
        'strengths': ";".join(strengths),
        'pack_count': pack_count_str,
        'price_per_unit': price_per_unit_str,
        'price_listed': "true" if price_listed else "false",
        'is_consumable': "true" if is_consumable else "false",
        'parse_ok': "true" if parse_ok else "false"
    }


def clean_jan_aushadhi(input_path: str, output_path: str):
    """Read raw Jan Aushadhi CSV, parse each row, write cleaned CSV."""
    df = pd.read_csv(input_path, encoding='utf-8')
    df.columns = [c.replace('\ufeff', '').replace('"', '').strip() for c in df.columns]

    out_rows = []
    for _, row in df.iterrows():
        parsed = parse_row(row.to_dict())
        out_rows.append(parsed)

    out_df = pd.DataFrame(out_rows)

    fieldnames = [
        'ja_code', 'raw_name', 'unit_size', 'ja_mrp', 'group',
        'form', 'molecules', 'strengths', 'pack_count',
        'price_per_unit', 'price_listed', 'is_consumable', 'parse_ok'
    ]

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    out_df.to_csv(output_path, index=False, columns=fieldnames, quoting=csv.QUOTE_MINIMAL)

    # Calculate statistics
    total_rows = len(out_df)
    consumables_count = (out_df['is_consumable'] == 'true').sum()
    no_price_count = (out_df['price_listed'] == 'false').sum()
    parse_ok_count = (out_df['parse_ok'] == 'true').sum()

    print("==================================================")
    print("JAN AUSHADHI CLEANING REPORT")
    print("==================================================")
    print(f"Total rows:        {total_rows}")
    print(f"Consumables:       {consumables_count}")
    print(f"No-price rows:     {no_price_count}")
    print(f"parse_ok count:    {parse_ok_count}")
    print(f"parse_ok=false:    {total_rows - parse_ok_count}")

    # 20 random parse_ok=false rows for review
    parse_false_rows = out_df[out_df['parse_ok'] == 'false']
    sample_count = min(20, len(parse_false_rows))
    sample_false = parse_false_rows.sample(n=sample_count, random_state=42)

    print("\n20 Sample parse_ok=false rows for review:")
    print("--------------------------------------------------")
    for idx, (_, r) in enumerate(sample_false.iterrows(), 1):
        reason = []
        if r['is_consumable'] == 'true':
            reason.append("consumable")
        if r['price_listed'] == 'false':
            reason.append("no price")
        if not r['form']:
            reason.append("missing form")
        if not r['molecules']:
            reason.append("missing molecules")
        if not r['strengths']:
            reason.append("missing strengths")
        reasons_str = ", ".join(reason) if reason else "other"
        print(f"{idx:2d}. Code {r['ja_code']}: '{r['raw_name']}' | Group: {r['group']} | Reason: [{reasons_str}]")

    return total_rows, consumables_count, no_price_count, parse_ok_count


if __name__ == "__main__":
    raw_default = os.path.join("data", "raw", "Product List_20_10_2026 @ 21_4_4.csv")
    clean_default = os.path.join("data", "clean", "jan_aushadhi_clean.csv")

    input_file = sys.argv[1] if len(sys.argv) > 1 else raw_default
    output_file = sys.argv[2] if len(sys.argv) > 2 else clean_default

    clean_jan_aushadhi(input_file, output_file)
