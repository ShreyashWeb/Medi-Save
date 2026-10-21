"""
Unit tests for scripts/clean_jan_aushadhi.py.
Validates at least 15 real rows from the raw Jan Aushadhi product list,
including slash strengths, combinations, no-price rows, and consumables.
"""

import pytest
from scripts.clean_jan_aushadhi import parse_row, parse_generic_name, normalise_strength


def test_slash_strength_atenolol_nifedipine():
    """Slash strength: Atenolol + Nifedipine Tablet (50/20 Mg)."""
    row = {
        'Drug Code': '280',
        'Generic Name': 'Atenolol + Nifedipine Tablet (50/20 Mg)',
        'Unit Size': "10's",
        'MRP': '21.50',
        'Group Name': 'Cardiovascular System (CVS)'
    }
    res = parse_row(row)
    assert res['form'] == 'tablet'
    assert res['molecules'] == 'atenolol;nifedipine'
    assert res['strengths'] == '50mg;20mg'
    assert res['pack_count'] == '10'
    assert res['ja_mrp'] == '21.50'
    assert res['price_per_unit'] == '2.15'
    assert res['price_listed'] == 'true'
    assert res['is_consumable'] == 'false'
    assert res['parse_ok'] == 'true'


def test_slash_strength_trifluoperazine():
    """Slash strength: Trifluoperazine + Trihexyphenidyl Tablet (5/2 Mg)."""
    row = {
        'Drug Code': '453',
        'Generic Name': 'Trifluoperazine + Trihexyphenidyl Tablet (5/2 Mg)',
        'Unit Size': "10's",
        'MRP': '12.00',
        'Group Name': 'Central Nervous System (CNS)'
    }
    res = parse_row(row)
    assert res['form'] == 'tablet'
    assert res['molecules'] == 'trifluoperazine;trihexyphenidyl'
    assert res['strengths'] == '5mg;2mg'
    assert res['parse_ok'] == 'true'


def test_combination_drug_aceclofenac_paracetamol():
    """Two-drug combination with inline strengths."""
    row = {
        'Drug Code': '1',
        'Generic Name': 'Aceclofenac 100mg and Paracetamol 325mg Tablets',
        'Unit Size': "10's",
        'MRP': '10.32',
        'Group Name': 'Analgesic/Antipyretic/Anti-Inflammatory'
    }
    res = parse_row(row)
    assert res['form'] == 'tablet'
    assert res['molecules'] == 'aceclofenac;paracetamol'
    assert res['strengths'] == '100mg;325mg'
    assert res['pack_count'] == '10'
    assert res['price_per_unit'] == '1.032'
    assert res['parse_ok'] == 'true'


def test_triple_combination_chlorzoxazone_diclofenac_paracetamol():
    """Three-drug combination drug."""
    row = {
        'Drug Code': '6',
        'Generic Name': 'Chlorzoxazone 500mg, Diclofenac 50mg and Paracetamol 325mg Tablets',
        'Unit Size': "10's",
        'MRP': '25.78',
        'Group Name': 'Analgesic/Antipyretic/Anti-Inflammatory'
    }
    res = parse_row(row)
    assert res['form'] == 'tablet'
    assert res['molecules'] == 'chlorzoxazone;diclofenac;paracetamol'
    assert res['strengths'] == '500mg;50mg;325mg'
    assert res['parse_ok'] == 'true'


def test_combination_plus_separator():
    """Combination drug with '+' separator: Torasemide 10mg + Spironolactone 25mg Tablets."""
    row = {
        'Drug Code': '1099',
        'Generic Name': 'Torasemide 10mg + Spironolactone 25mg Tablets',
        'Unit Size': "10's",
        'MRP': '27.50',
        'Group Name': 'Cardiovascular System (CVS)'
    }
    res = parse_row(row)
    assert res['form'] == 'tablet'
    assert res['molecules'] == 'torasemide;spironolactone'
    assert res['strengths'] == '10mg;25mg'
    assert res['parse_ok'] == 'true'


def test_single_drug_tablet():
    """Single drug tablet: Aceclofenac Tablets IP 100 mg."""
    row = {
        'Drug Code': '2',
        'Generic Name': 'Aceclofenac Tablets IP 100 mg',
        'Unit Size': "10's",
        'MRP': '8.25',
        'Group Name': 'Analgesic/Antipyretic/Anti-Inflammatory'
    }
    res = parse_row(row)
    assert res['form'] == 'tablet'
    assert res['molecules'] == 'aceclofenac'
    assert res['strengths'] == '100mg'
    assert res['pack_count'] == '10'
    assert res['price_per_unit'] == '0.825'
    assert res['parse_ok'] == 'true'


def test_single_drug_capsule():
    """Single drug capsule: Pregabalin Capsules IP 75 mg."""
    row = {
        'Drug Code': '3',
        'Generic Name': 'Pregabalin Capsules IP 75 mg',
        'Unit Size': "10's",
        'MRP': '22.69',
        'Group Name': 'Central Nervous System (CNS)'
    }
    res = parse_row(row)
    assert res['form'] == 'capsule'
    assert res['molecules'] == 'pregabalin'
    assert res['strengths'] == '75mg'
    assert res['parse_ok'] == 'true'


def test_gastro_resistant_tablet():
    """Gastro-resistant tablet: Aspirin Gastro-resistant Tablets IP 150 mg."""
    row = {
        'Drug Code': '5',
        'Generic Name': 'Aspirin Gastro-resistant Tablets IP 150 mg',
        'Unit Size': "14's",
        'MRP': '5.16',
        'Group Name': 'Analgesic/Antipyretic/Anti-Inflammatory'
    }
    res = parse_row(row)
    assert res['form'] == 'tablet'
    assert res['molecules'] == 'aspirin'
    assert res['strengths'] == '150mg'
    assert res['pack_count'] == '14'
    assert res['price_listed'] == 'true'
    assert res['parse_ok'] == 'true'


def test_prolonged_release_tablet():
    """Prolonged release tablet: Diclofenac Sodium Prolonged Release Tablets IP 100 mg."""
    row = {
        'Drug Code': '9',
        'Generic Name': 'Diclofenac Sodium Prolonged Release Tablets IP 100 mg',
        'Unit Size': "10's",
        'MRP': '12.47',
        'Group Name': 'Analgesic/Antipyretic/Anti-Inflammatory'
    }
    res = parse_row(row)
    assert res['form'] == 'tablet'
    assert 'diclofenac' in res['molecules']
    assert res['strengths'] == '100mg'
    assert res['parse_ok'] == 'true'


def test_injection_per_ml():
    """Injection with per ml concentration: Diclofenac Sodium Injection IP 25mg per ml."""
    row = {
        'Drug Code': '10',
        'Generic Name': 'Diclofenac Sodium Injection IP 25mg per ml',
        'Unit Size': '3 ml',
        'MRP': '3.75',
        'Group Name': 'Analgesic/Antipyretic/Anti-Inflammatory'
    }
    res = parse_row(row)
    assert res['form'] == 'injection'
    assert 'diclofenac' in res['molecules']
    assert res['strengths'] == '25mg/ml'
    assert res['pack_count'] == ''  # not count-style
    assert res['price_per_unit'] == ''
    assert res['parse_ok'] == 'true'


def test_topical_gel_percentage():
    """Topical gel with percentage: Diclofenac Gel IP 1.16%w/w (Diclofenac Diethylamine)."""
    row = {
        'Drug Code': '7',
        'Generic Name': 'Diclofenac Gel IP 1.16%w/w (Diclofenac Diethylamine)',
        'Unit Size': '15 g',
        'MRP': '12.38',
        'Group Name': 'Dermatology/Topical/External'
    }
    res = parse_row(row)
    assert res['form'] == 'gel'
    assert 'diclofenac' in res['molecules']
    assert res['strengths'] == '1.16% w/w'
    assert res['pack_count'] == ''
    assert res['parse_ok'] == 'true'


def test_ointment_percentage():
    """Ointment with percentage: Povidone Iodine Ointment 5% w/w."""
    row = {
        'Drug Code': '114',
        'Generic Name': 'Povidone Iodine Ointment 5% w/w',
        'Unit Size': '15 g',
        'MRP': '18.50',
        'Group Name': 'Dermatology/Topical/External'
    }
    res = parse_row(row)
    assert res['form'] == 'ointment'
    assert 'povidone iodine' in res['molecules']
    assert res['strengths'] == '5% w/w'
    assert res['parse_ok'] == 'true'


def test_paediatric_suspension():
    """Paediatric oral suspension: Paracetamol Paediatric Oral Suspension IP 125 mg per 5 ml."""
    row = {
        'Drug Code': '22',
        'Generic Name': 'Paracetamol Paediatric Oral Suspension IP 125 mg per 5 ml',
        'Unit Size': '60 ml',
        'MRP': '16.50',
        'Group Name': 'Analgesic/Antipyretic/Anti-Inflammatory'
    }
    res = parse_row(row)
    assert res['form'] == 'suspension'
    assert res['molecules'] == 'paracetamol'
    assert res['strengths'] == '125mg/5ml'
    assert res['pack_count'] == ''
    assert res['parse_ok'] == 'true'


def test_no_price_row():
    """No-price row: MRP 0 becomes empty and price_listed=false, parse_ok=false."""
    row = {
        'Drug Code': '1029',
        'Generic Name': 'Pyrazinamide Tablets IP 1000mg',
        'Unit Size': "10's",
        'MRP': '0.00',
        'Group Name': 'Anti-T.B'
    }
    res = parse_row(row)
    assert res['ja_mrp'] == ''
    assert res['price_listed'] == 'false'
    assert res['price_per_unit'] == ''
    assert res['is_consumable'] == 'false'
    assert res['parse_ok'] == 'false'
    assert res['molecules'] == 'pyrazinamide'
    assert res['strengths'] == '1000mg'


def test_consumable_row():
    """Consumable row: Surgical & Medical Consumables has is_consumable=true and parse_ok=false."""
    row = {
        'Drug Code': '5001',
        'Generic Name': 'Absorbent Cotton Wool IP 75 g',
        'Unit Size': "1's",
        'MRP': '27.19',
        'Group Name': 'Surgical & Medical Consumables'
    }
    res = parse_row(row)
    assert res['is_consumable'] == 'true'
    assert res['parse_ok'] == 'false'
    assert res['form'] == ''
    assert res['molecules'] == ''
    assert res['strengths'] == ''
    assert res['pack_count'] == '1'
    assert res['ja_mrp'] == '27.19'


def test_antibiotic_capsule():
    """Antibiotic capsule: Amoxycillin Capsules IP 250 mg."""
    row = {
        'Drug Code': '41',
        'Generic Name': 'Amoxycillin Capsules IP 250 mg',
        'Unit Size': "10's",
        'MRP': '15.20',
        'Group Name': 'Antibiotics'
    }
    res = parse_row(row)
    assert res['form'] == 'capsule'
    assert res['molecules'] == 'amoxycillin'
    assert res['strengths'] == '250mg'
    assert res['pack_count'] == '10'
    assert res['price_per_unit'] == '1.52'
    assert res['parse_ok'] == 'true'


def test_eye_drop():
    """Eye drop solution: Ciprofloxacin Eye Drops IP 0.3% w/v."""
    row = {
        'Drug Code': '57',
        'Generic Name': 'Ciprofloxacin Eye Drops IP 0.3% w/v',
        'Unit Size': '5 ml',
        'MRP': '9.10',
        'Group Name': 'Opthalmic/Otic'
    }
    res = parse_row(row)
    assert res['form'] == 'drops'
    assert res['molecules'] == 'ciprofloxacin'
    assert res['strengths'] == '0.3% w/v'
    assert res['parse_ok'] == 'true'
