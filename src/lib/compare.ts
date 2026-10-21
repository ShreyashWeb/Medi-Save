/**
 * MediSave Price Comparison Engine
 * 
 * Strict Rules (agents.md & trd.md section 7):
 * - Same-quantity generic price: price_per_unit * brand.pack_count.
 * - Labelled as approximate.
 * - Never displays a price of 0: unlisted prices result in priceListed=false.
 * - Headline saving: brand.brand_mrp - genericEquivalentPrice.
 * - Clear distinction between brand MRP and government Jan Aushadhi price.
 */

import type { BrandItem, GenericItem } from './matcher.ts';

export interface ComparisonResult {
  brandId: string;
  brandName: string;
  brandMrp: number;
  packCount: number;
  jaCode: number | string;
  genericName: string;
  molecules: string[];
  strengths: string[];
  form: string;
  genericUnitPrice: number | null;
  genericEquivalentPrice: number | null;
  savingAmount: number | null;
  savingPercent: number | null;
  priceListed: boolean;
  sourceUrl: string;
  sourceDate: string;
  dataDate: string;
}

/**
 * Compare a commercial brand medicine against its linked Jan Aushadhi generic.
 */
export function comparePrice(brand: BrandItem, generic: GenericItem): ComparisonResult {
  const isListed = generic.price_listed && generic.price_per_unit !== null && generic.price_per_unit > 0;

  let genericEquivalentPrice: number | null = null;
  let savingAmount: number | null = null;
  let savingPercent: number | null = null;

  if (isListed && generic.price_per_unit !== null) {
    // Equivalent price for identical pack quantity
    const rawEquiv = generic.price_per_unit * brand.pack_count;
    genericEquivalentPrice = Math.round(rawEquiv * 100) / 100;

    const rawSaving = brand.brand_mrp - genericEquivalentPrice;
    savingAmount = Math.max(0, Math.round(rawSaving * 100) / 100);

    if (brand.brand_mrp > 0) {
      savingPercent = Math.round((savingAmount / brand.brand_mrp) * 100);
    }
  }

  return {
    brandId: brand.brand_id,
    brandName: brand.brand_name,
    brandMrp: brand.brand_mrp,
    packCount: brand.pack_count,
    jaCode: generic.ja_code,
    genericName: generic.raw_name,
    molecules: brand.molecules,
    strengths: brand.strengths,
    form: brand.form,
    genericUnitPrice: generic.price_per_unit,
    genericEquivalentPrice,
    savingAmount,
    savingPercent,
    priceListed: isListed,
    sourceUrl: brand.source_url,
    sourceDate: brand.source_date,
    dataDate: brand.source_date,
  };
}
