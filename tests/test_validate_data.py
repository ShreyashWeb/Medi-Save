"""
Tests for scripts/validate_data.py.

Includes one passing and one failing test per validation rule:
1. source_url required
2. source_date required
3. ja_code exists in generics
4. linked generic has parse_ok=true and price_listed=true
5. brand and generic agree on molecules, strengths, and form
6. brand_mrp is positive
7. pack_count is positive
8. brand_id is unique
"""

import pytest
import pandas as pd
from scripts.validate_data import validate_brands, ValidationError


@pytest.fixture
def sample_generics_df():
    """Generics dataset mock containing real-format sample rows."""
    return pd.DataFrame([
        {
            'ja_code': '511',
            'raw_name': 'Paracetamol Tablets IP 650 mg',
            'form': 'tablet',
            'molecules': 'paracetamol',
            'strengths': '650mg',
            'pack_count': '15',
            'ja_mrp': '15.47',
            'price_listed': 'true',
            'is_consumable': 'false',
            'parse_ok': 'true'
        },
        {
            'ja_code': '1',
            'raw_name': 'Aceclofenac 100mg and Paracetamol 325mg Tablets',
            'form': 'tablet',
            'molecules': 'aceclofenac;paracetamol',
            'strengths': '100mg;325mg',
            'pack_count': '10',
            'ja_mrp': '10.32',
            'price_listed': 'true',
            'is_consumable': 'false',
            'parse_ok': 'true'
        },
        {
            'ja_code': '1029',
            'raw_name': 'Pyrazinamide Tablets IP 1000mg',
            'form': 'tablet',
            'molecules': 'pyrazinamide',
            'strengths': '1000mg',
            'pack_count': '10',
            'ja_mrp': '',
            'price_listed': 'false',
            'is_consumable': 'false',
            'parse_ok': 'false'
        },
        {
            'ja_code': '5001',
            'raw_name': 'Absorbent Cotton Wool IP 75 g',
            'form': '',
            'molecules': '',
            'strengths': '',
            'pack_count': '1',
            'ja_mrp': '27.19',
            'price_listed': 'true',
            'is_consumable': 'true',
            'parse_ok': 'false'
        }
    ])


@pytest.fixture
def valid_brand_row():
    return {
        'brand_id': 'dolo-650',
        'brand_name': 'Dolo 650',
        'manufacturer': 'Micro Labs Ltd',
        'molecules': 'paracetamol',
        'strengths': '650mg',
        'form': 'tablet',
        'pack_count': '15',
        'brand_mrp': '34.15',
        'source_url': 'https://example.com/source',
        'source_date': '2026-10-20',
        'ja_code': '511',
        'aliases': 'dolo;डोलो 650'
    }


# --- Rule 1: source_url ---

def test_rule1_source_url_passing(valid_brand_row, sample_generics_df):
    brands_df = pd.DataFrame([valid_brand_row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is True
    assert len(errors) == 0


def test_rule1_source_url_failing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['source_url'] = ''
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("Missing required 'source_url'" in e for e in errors)


# --- Rule 2: source_date ---

def test_rule2_source_date_passing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['source_date'] = '2026-10-20'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is True


def test_rule2_source_date_failing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['source_date'] = ''
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("Missing required 'source_date'" in e for e in errors)


# --- Rule 3: ja_code exists ---

def test_rule3_ja_code_exists_passing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['ja_code'] = '511'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is True


def test_rule3_ja_code_exists_failing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['ja_code'] = '999999'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("does not exist in Jan Aushadhi generic list" in e for e in errors)


# --- Rule 4: linked generic parse_ok and price_listed ---

def test_rule4_linked_generic_valid_passing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['ja_code'] = '511'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is True


def test_rule4_linked_generic_parse_ok_failing(valid_brand_row, sample_generics_df):
    # ja_code 5001 has parse_ok=false (consumable)
    row = valid_brand_row.copy()
    row['ja_code'] = '5001'
    row['form'] = ''
    row['molecules'] = ''
    row['strengths'] = ''
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("has parse_ok=false" in e for e in errors)


def test_rule4_linked_generic_price_listed_failing(valid_brand_row, sample_generics_df):
    # ja_code 1029 has price_listed=false
    row = valid_brand_row.copy()
    row['ja_code'] = '1029'
    row['molecules'] = 'pyrazinamide'
    row['strengths'] = '1000mg'
    row['form'] = 'tablet'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("has price_listed=false" in e for e in errors)


# --- Rule 5: agreement on molecules, strengths, form ---

def test_rule5_agreement_passing(valid_brand_row, sample_generics_df):
    brands_df = pd.DataFrame([valid_brand_row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is True


def test_rule5_molecules_disagree_failing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['molecules'] = 'ibuprofen'  # generic has paracetamol
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("Molecules mismatch" in e for e in errors)


def test_rule5_strengths_disagree_failing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['strengths'] = '500mg'  # generic has 650mg
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("Strengths mismatch" in e for e in errors)


def test_rule5_form_disagree_failing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['form'] = 'capsule'  # generic has tablet
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("Form mismatch" in e for e in errors)


# --- Rule 6: brand_mrp positive ---

def test_rule6_mrp_positive_passing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['brand_mrp'] = '34.15'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is True


def test_rule6_mrp_non_positive_failing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['brand_mrp'] = '0.00'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("'brand_mrp' must be positive" in e for e in errors)


# --- Rule 7: pack_count positive ---

def test_rule7_pack_count_positive_passing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['pack_count'] = '15'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is True


def test_rule7_pack_count_non_positive_failing(valid_brand_row, sample_generics_df):
    row = valid_brand_row.copy()
    row['pack_count'] = '0'
    brands_df = pd.DataFrame([row])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("'pack_count' must be positive" in e for e in errors)


# --- Rule 8: brand_id unique ---

def test_rule8_unique_brand_id_passing(valid_brand_row, sample_generics_df):
    row2 = valid_brand_row.copy()
    row2['brand_id'] = 'crocin-650'
    row2['brand_name'] = 'Crocin 650'
    brands_df = pd.DataFrame([valid_brand_row, row2])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is True


def test_rule8_duplicate_brand_id_failing(valid_brand_row, sample_generics_df):
    row2 = valid_brand_row.copy()
    brands_df = pd.DataFrame([valid_brand_row, row2])
    is_valid, errors = validate_brands(brands_df, sample_generics_df)
    assert is_valid is False
    assert any("Duplicate 'brand_id' 'dolo-650'" in e for e in errors)
