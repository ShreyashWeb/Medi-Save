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
  let decision = findMatches(q, brands, generics, {
    confidentThreshold: 0.70,
    candidateThreshold: 0.40,
    maxCandidates: limit,
  });

  // If no direct matches, check clinical condition aliases (diabetes, fever, bp, acidity, etc.)
  if (decision.candidates.length === 0) {
    const CONDITION_ALIASES: Record<string, string> = {
      diabetes: 'Glycomet 500',
      diabates: 'Glycomet 500',
      diabetic: 'Glycomet 500',
      diabities: 'Glycomet 500',
      sugar: 'Glycomet 500',
      madhumeh: 'Glycomet 500',
      metformin: 'Glycomet 500',
      bp: 'Telma 40',
      hypertension: 'Telma 40',
      fever: 'Dolo 650',
      bukhar: 'Dolo 650',
      headache: 'Dolo 650',
      acidity: 'Pan 40',
      gas: 'Pan 40',
      heartburn: 'Pan 40',
      allergy: 'Allegra',
      cough: 'Cetirizine',
      sardi: 'Cetirizine',
      pain: 'Combiflam',
      calcium: 'Shelcal 500',
      cholesterol: 'Atorva 20',
    };

    const qLower = q.toLowerCase();
    for (const [cond, target] of Object.entries(CONDITION_ALIASES)) {
      if (qLower.includes(cond)) {
        const condDecision = findMatches(target, brands, generics, {
          confidentThreshold: 0.60,
          candidateThreshold: 0.35,
          maxCandidates: limit,
        });
        if (condDecision.candidates.length > 0) {
          decision = condDecision;
          break;
        }
      }
    }
  }

  // Fallback on extracted keyword tokens
  if (decision.candidates.length === 0) {
    const stopWords = new Set([
      'what', 'is', 'the', 'price', 'of', 'tell', 'me', 'about', 'explain',
      'cost', 'rate', 'a', 'an', 'for', 'medicine', 'tablet', 'pill', 'capsule',
      'dawa', 'dawai', 'kya', 'hai', 'ka', 'ki', 'ke', 'batao', 'bataiye'
    ]);
    const cleanTokens = q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !stopWords.has(w));

    if (cleanTokens.length > 0) {
      const fallbackQuery = cleanTokens.join(' ');
      const fallbackDecision = findMatches(fallbackQuery, brands, generics, {
        confidentThreshold: 0.60,
        candidateThreshold: 0.35,
        maxCandidates: limit,
      });
      if (fallbackDecision.candidates.length > 0) {
        decision = fallbackDecision;
      }
    }
  }

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
