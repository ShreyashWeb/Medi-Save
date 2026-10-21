import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import { normalise, parseQuery } from '../src/lib/normalise.ts';
import {
  findMatches,
  trigramSimilarity,
  levenshteinDistance,
  phoneticKey,
} from '../src/lib/matcher.ts';
import type { BrandItem, GenericItem } from '../src/lib/matcher.ts';
import { comparePrice } from '../src/lib/compare.ts';
import { sanitizeCandidates, parseModelResponse } from '../src/lib/ocr.ts';

console.log('--- RUNNING UNIT TESTS FOR MEDISAVE LOGIC MODULES ---');

// 1. Normalisation Tests
console.log('Testing normalise...');
assert.strictEqual(normalise('  Dolo 650  '), 'dolo 650');
assert.strictEqual(normalise('AUGMENTIN-625 (DUO)!'), 'augmentin 625 duo');
assert.strictEqual(normalise('डोलो 650'), 'dolo 650');
assert.strictEqual(normalise('पैरासिटामोल'), 'paracetamol');
assert.strictEqual(normalise(''), '');

const pq1 = parseQuery('Dolo 650mg');
assert.strictEqual(pq1.namePart, 'dolo');
assert.strictEqual(pq1.strengthHint, '650');

const pq2 = parseQuery('Augmentin 625 duo');
assert.strictEqual(pq2.namePart, 'augmentin duo');
assert.strictEqual(pq2.strengthHint, '625');
console.log('✔ Normalisation tests passed.');

// 2. OCR Sanitization & Defensive Parsing Tests
console.log('Testing OCR defensive parsing...');
// Strip HTML
const rawHtml = ['<b>Dolo 650</b>', '<script>alert(1)</script>Pan 40', 'Valid Medicine'];
const cleanHtml = sanitizeCandidates(rawHtml);
assert.deepStrictEqual(cleanHtml, ['Dolo 650', 'Pan 40', 'Valid Medicine']);

// Length cap at 60 chars
const longStr = ['A'.repeat(80)];
const capped = sanitizeCandidates(longStr);
assert.strictEqual(capped[0].length, 60);

// Cap at 10 candidates
const eleven = Array.from({ length: 15 }, (_, i) => `Med_${i}`);
const cappedList = sanitizeCandidates(eleven);
assert.strictEqual(cappedList.length, 10);

// Markdown JSON parsing
const mockGemmaMarkdown = '```json\n{"names": ["Augmentin 625 Duo", "Dolo 650"]}\n```';
const parsedMd = parseModelResponse(mockGemmaMarkdown);
assert.deepStrictEqual(parsedMd, ['Augmentin 625 Duo', 'Dolo 650']);

// Non-JSON fallback line parsing
const mockFallback = 'Here are the names:\n- Metformin 500\n- Atorvastatin 10';
const parsedFallback = parseModelResponse(mockFallback);
assert.deepStrictEqual(parsedFallback, ['Metformin 500', 'Atorvastatin 10']);
console.log('✔ OCR parsing and sanitization tests passed.');

// 3. Matcher Tests
console.log('Testing fuzzy matcher against shipped datasets...');
const brandsPath = path.resolve('public/data/brands.json');
const genericsPath = path.resolve('public/data/generics.json');

const brands: BrandItem[] = JSON.parse(fs.readFileSync(brandsPath, 'utf8'));
const generics: GenericItem[] = JSON.parse(fs.readFileSync(genericsPath, 'utf8'));

// Exact match
const matchExact = findMatches('Dolo 650', brands, generics);
assert.strictEqual(matchExact.outcome, 'confident');
assert.strictEqual(matchExact.bestMatch?.displayName, 'Dolo 650');

// Typo tolerance
const matchTypo = findMatches('Dollo 650', brands, generics);
assert.ok(matchTypo.outcome === 'confident' || matchTypo.outcome === 'did_you_mean');
assert.strictEqual(matchTypo.bestMatch?.displayName, 'Dolo 650');

// Hindi query match
const matchHindi = findMatches('डोलो 650', brands, generics);
assert.strictEqual(matchHindi.bestMatch?.displayName, 'Dolo 650');

// Unknown drug (Zero hallucination)
const matchUnknown = findMatches('NonExistentMiracleDrug123', brands, generics);
assert.strictEqual(matchUnknown.outcome, 'not_found');
assert.strictEqual(matchUnknown.candidates.length, 0);
console.log('✔ Fuzzy matcher tests passed.');

// 4. Comparison Tests
console.log('Testing price comparison engine...');
const doloBrand = brands.find((b) => b.brand_id === 'dolo-650')!;
const doloGeneric = generics.find((g) => Number(g.ja_code) === Number(doloBrand.ja_code))!;

const comp = comparePrice(doloBrand, doloGeneric);
assert.strictEqual(comp.brandId, 'dolo-650');
assert.strictEqual(comp.packCount, 15);
assert.strictEqual(comp.brandMrp, 34.15);
assert.strictEqual(comp.priceListed, true);
assert.ok(comp.genericEquivalentPrice !== null && comp.genericEquivalentPrice > 0);
assert.ok(comp.savingAmount !== null && comp.savingAmount > 0);
assert.ok(comp.savingPercent !== null && comp.savingPercent > 0);

// Unlisted price handling
const mockUnlistedGeneric: GenericItem = {
  ...doloGeneric,
  price_per_unit: null,
  ja_mrp: null,
  price_listed: false,
};
const unlistedComp = comparePrice(doloBrand, mockUnlistedGeneric);
assert.strictEqual(unlistedComp.priceListed, false);
assert.strictEqual(unlistedComp.genericEquivalentPrice, null);
assert.strictEqual(unlistedComp.savingAmount, null);
console.log('✔ Price comparison tests passed.');

console.log('\nALL LOGIC UNIT TESTS PASSED SUCCESSFULLY! (4/4 test suites)');
