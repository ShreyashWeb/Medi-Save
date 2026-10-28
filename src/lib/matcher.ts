/**
 * MediSave Medicine Matcher
 * 
 * Strict deterministic matching engine against official Jan Aushadhi and cited brand records.
 * Rules:
 * - Zero hallucination.
 * - Trigram Jaccard similarity + Levenshtein distance + Sound-alike phonetic key.
 * - Strength filter & bonus.
 * - Outcomes: Confident match (>=0.75), "Did you mean" list (>=0.45), or Not Found.
 */

import { normalise, parseQuery } from './normalise.ts';

export interface GenericItem {
  ja_code: number | string;
  raw_name: string;
  molecules: string[];
  strengths: string[];
  form: string;
  unit_size: string;
  pack_count: number | null;
  ja_mrp: number | null;
  price_listed: boolean;
  price_per_unit: number | null;
  group?: string;
  is_consumable?: boolean;
  parse_ok?: boolean;
}

export interface BrandItem {
  brand_id: string;
  brand_name: string;
  manufacturer?: string;
  molecules: string[];
  strengths: string[];
  form: string;
  pack_count: number;
  brand_mrp: number;
  source_url: string;
  source_date: string;
  ja_code: number | string;
  aliases?: string[];
  data_date?: string;
}

export interface MatchScore {
  item: BrandItem | GenericItem;
  type: 'brand' | 'generic';
  displayName: string;
  score: number;
  matchedOn: string;
  strengthMatched: boolean;
}

export interface MatchDecision {
  outcome: 'confident' | 'did_you_mean' | 'not_found';
  bestMatch?: MatchScore;
  candidates: MatchScore[];
}

export interface MatcherConfig {
  confidentThreshold: number; // >= 0.75
  candidateThreshold: number; // >= 0.45
  maxCandidates: number;      // e.g. 5
}

export const DEFAULT_MATCHER_CONFIG: MatcherConfig = {
  confidentThreshold: 0.75,
  candidateThreshold: 0.45,
  maxCandidates: 5,
};

/**
 * Generate character trigrams for a string.
 */
export function getTrigrams(str: string): Set<string> {
  const trigrams = new Set<string>();
  const padded = `  ${str} `;
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Calculate Jaccard similarity between two trigram sets.
 */
export function trigramSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1.0;

  const set1 = getTrigrams(str1);
  const set2 = getTrigrams(str2);

  let intersection = 0;
  for (const tri of set1) {
    if (set2.has(tri)) {
      intersection++;
    }
  }

  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compute Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * Simplified phonetic / Soundex key for Indian drug brand names.
 */
export function phoneticKey(str: string): string {
  if (!str) return '';
  const clean = normalise(str).replace(/[^a-z]/g, '');
  if (!clean) return '';

  return clean
    .replace(/[aeiouywh]/g, '')
    .replace(/[bfpv]/g, '1')
    .replace(/[cgjkqsxz]/g, '2')
    .replace(/[dt]/g, '3')
    .replace(/[l]/g, '4')
    .replace(/[mn]/g, '5')
    .replace(/[r]/g, '6')
    .slice(0, 5);
}

/**
 * Score a candidate target against the user query.
 */
export function computeSimilarityScore(
  queryNorm: string,
  targetNorm: string,
  queryStrength?: string,
  targetStrengths?: string[]
): { score: number; strengthMatched: boolean } {
  if (!queryNorm || !targetNorm) {
    return { score: 0, strengthMatched: false };
  }

  // Exact match
  if (queryNorm === targetNorm) {
    return { score: 1.0, strengthMatched: true };
  }

  // Prefix match bonus
  if (targetNorm.startsWith(queryNorm) || queryNorm.startsWith(targetNorm)) {
    const lenRatio = Math.min(queryNorm.length, targetNorm.length) / Math.max(queryNorm.length, targetNorm.length);
    if (lenRatio > 0.6) {
      return { score: 0.85 + 0.1 * lenRatio, strengthMatched: true };
    }
  }

  // 1. Trigram similarity
  const triScore = trigramSimilarity(queryNorm, targetNorm);

  // 2. Normalised Levenshtein similarity
  const maxLen = Math.max(queryNorm.length, targetNorm.length);
  const dist = levenshteinDistance(queryNorm, targetNorm);
  const levScore = 1.0 - dist / maxLen;

  // 3. Phonetic match check
  const phoneA = phoneticKey(queryNorm);
  const phoneB = phoneticKey(targetNorm);
  const phoneMatch = phoneA && phoneB && phoneA === phoneB;

  // Weighted composite score
  let composite = 0.55 * triScore + 0.35 * levScore + (phoneMatch ? 0.1 : 0);

  // 4. Strength checking
  let strengthMatched = false;
  if (queryStrength && targetStrengths && targetStrengths.length > 0) {
    strengthMatched = targetStrengths.some((s) => s.includes(queryStrength) || queryStrength.includes(s));
    if (strengthMatched) {
      composite = Math.min(1.0, composite + 0.15);
    } else {
      // Penalty if user explicitly typed a strength but target has a different strength
      composite = Math.max(0, composite - 0.2);
    }
  }

  return {
    score: Math.min(1.0, Math.max(0, composite)),
    strengthMatched,
  };
}

/**
 * Match a search query against brand and generic catalogues.
 */
export function findMatches(
  rawQuery: string,
  brands: BrandItem[],
  generics: GenericItem[],
  config: MatcherConfig = DEFAULT_MATCHER_CONFIG
): MatchDecision {
  const parsed = parseQuery(rawQuery);
  if (!parsed.normalised) {
    return { outcome: 'not_found', candidates: [] };
  }

  const scored: MatchScore[] = [];

  // 1. Search brand names, aliases, and active molecules
  for (const b of brands) {
    const candidatesToScore = [
      { text: b.brand_name, matchedOn: b.brand_name },
      ...(b.aliases || []).map((a) => ({ text: a, matchedOn: a })),
      ...(b.molecules || []).map((m) => ({ text: m, matchedOn: m })),
    ];

    let bestScore = 0;
    let bestMatchedOn = b.brand_name;
    let bestStrength = false;

    for (const c of candidatesToScore) {
      const cNorm = normalise(c.text);
      const { score, strengthMatched } = computeSimilarityScore(
        parsed.normalised,
        cNorm,
        parsed.strengthHint,
        b.strengths
      );
      if (score > bestScore) {
        bestScore = score;
        bestMatchedOn = c.matchedOn;
        bestStrength = strengthMatched;
      }
    }

    if (bestScore >= config.candidateThreshold) {
      scored.push({
        item: b,
        type: 'brand',
        displayName: b.brand_name,
        score: bestScore,
        matchedOn: bestMatchedOn,
        strengthMatched: bestStrength,
      });
    }
  }

  // 2. Search direct generic molecule names and individual molecules
  for (const g of generics) {
    const genericNorm = normalise(g.raw_name);
    let { score, strengthMatched } = computeSimilarityScore(
      parsed.normalised,
      genericNorm,
      parsed.strengthHint,
      g.strengths
    );

    // Also check individual active molecule names
    for (const m of g.molecules || []) {
      const mNorm = normalise(m);
      const mScore = computeSimilarityScore(parsed.normalised, mNorm, parsed.strengthHint, g.strengths);
      if (mScore.score > score) {
        score = mScore.score;
        strengthMatched = mScore.strengthMatched;
      }
    }

    if (score >= config.candidateThreshold) {
      scored.push({
        item: g,
        type: 'generic',
        displayName: g.raw_name,
        score,
        matchedOn: g.raw_name,
        strengthMatched,
      });
    }
  }

  // Sort candidates by score descending
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by display name
  const deduped: MatchScore[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    const key = `${s.type}:${s.displayName.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(s);
    }
    if (deduped.length >= config.maxCandidates) break;
  }

  if (deduped.length === 0) {
    return { outcome: 'not_found', candidates: [] };
  }

  const best = deduped[0];

  // Confident decision if top score meets confident threshold and is clearly ahead
  if (best.score >= config.confidentThreshold) {
    return {
      outcome: 'confident',
      bestMatch: best,
      candidates: deduped,
    };
  }

  // Otherwise "did you mean"
  return {
    outcome: 'did_you_mean',
    bestMatch: best,
    candidates: deduped,
  };
}
