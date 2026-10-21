import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { findMatches, type BrandItem, type GenericItem } from '../../../lib/matcher';
import { comparePrice } from '../../../lib/compare';

let cachedBrands: BrandItem[] | null = null;
let cachedGenerics: GenericItem[] | null = null;

function loadData() {
  if (!cachedBrands || !cachedGenerics) {
    const brandsPath = path.join(process.cwd(), 'public', 'data', 'brands.json');
    const genericsPath = path.join(process.cwd(), 'public', 'data', 'generics.json');

    try {
      const brandsRaw = fs.readFileSync(brandsPath, 'utf-8');
      const genericsRaw = fs.readFileSync(genericsPath, 'utf-8');
      const parsedBrands = JSON.parse(brandsRaw);
      const parsedGenerics = JSON.parse(genericsRaw);
      cachedBrands = Array.isArray(parsedBrands) ? parsedBrands : (parsedBrands.data || []);
      cachedGenerics = Array.isArray(parsedGenerics) ? parsedGenerics : (parsedGenerics.data || []);
    } catch (e) {
      console.error('Error loading public datasets for /api/search:', e);
      cachedBrands = [];
      cachedGenerics = [];
    }
  }
  return { brands: cachedBrands || [], generics: cachedGenerics || [] };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)));

  if (!q.trim()) {
    return NextResponse.json({ query: q, total: 0, results: [] });
  }

  const { brands, generics } = loadData();
  const decision = findMatches(q, brands, generics, {
    confidentThreshold: 0.70,
    candidateThreshold: 0.40,
    maxCandidates: limit,
  });

  const genericMap = new Map<string | number, GenericItem>();
  for (const g of generics) {
    genericMap.set(String(g.ja_code), g);
  }

  const results = decision.candidates.map((c) => {
    if (c.type === 'brand') {
      const brand = c.item as BrandItem;
      const generic = genericMap.get(String(brand.ja_code));
      let comp = null;
      if (generic) {
        comp = comparePrice(brand, generic);
      }
      return {
        type: 'brand',
        brand_name: brand.brand_name,
        manufacturer: brand.manufacturer || 'Commercial Pharma',
        molecules: brand.molecules,
        strengths: brand.strengths,
        form: brand.form,
        pack_count: brand.pack_count,
        brand_mrp: brand.brand_mrp,
        ja_code: brand.ja_code,
        generic_name: generic?.raw_name || brand.brand_name,
        generic_price: comp?.genericEquivalentPrice || generic?.ja_mrp || null,
        saving_pct: comp?.savingPercent || null,
        saving_amount: comp?.savingAmount || null,
        score: Math.round(c.score * 100),
      };
    } else {
      const generic = c.item as GenericItem;
      return {
        type: 'generic',
        brand_name: generic.raw_name,
        manufacturer: 'Jan Aushadhi (PMBI)',
        molecules: generic.molecules,
        strengths: generic.strengths,
        form: generic.form,
        pack_count: generic.pack_count || 10,
        brand_mrp: null,
        ja_code: generic.ja_code,
        generic_name: generic.raw_name,
        generic_price: generic.ja_mrp,
        saving_pct: null,
        saving_amount: null,
        score: Math.round(c.score * 100),
      };
    }
  });

  return NextResponse.json({
    query: q,
    outcome: decision.outcome,
    total: results.length,
    results,
  });
}
