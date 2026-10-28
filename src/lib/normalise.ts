/**
 * Text normalisation utilities for MediSave query matcher.
 * Follows TRD Section 6 contract:
 * - Lowercase folding
 * - Diacritic stripping
 * - Punctuation and special character removal
 * - Whitespace collapsing
 * - Common Devanagari Hindi medicine name transliteration/aliases
 * - Strength extraction helper
 */

// Common Hindi (Devanagari) phonetic mappings for Indian medicines
const HINDI_TO_LATIN_MAP: Record<string, string> = {
  'डोलो': 'dolo',
  'पैरासिटामोल': 'paracetamol',
  'पैरासीटामोल': 'paracetamol',
  'ऑगमेंटिन': 'augmentin',
  'ऑग्मेंटिन': 'augmentin',
  'पैन': 'pan',
  'पैन डी': 'pan d',
  'ग्लुकोफेज': 'glucophage',
  'ग्लाइकोमेट': 'glycomet',
  'एटोर्वा': 'atorva',
  'टेलमा': 'telma',
  'एज़िथ्रल': 'azithral',
  'अमोक्सिसिलिन': 'amoxicillin',
  'एमोक्सिसिलिन': 'amoxicillin',
  'मोंटेक एलसी': 'montek lc',
  'सेट्रिज़िन': 'cetirizine',
  'सिट्रिज़िन': 'cetirizine',
  'विक्स': 'vicks',
  'अल्ट्रासेट': 'ultracet',
  'रैंटैक': 'rantac',
  'ज़ेंटैक': 'zantac',
};

/**
 * Normalise a search query string.
 */
export function normalise(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let clean = text.trim();

  // Check Hindi alias lookup directly or word-by-word
  for (const [hi, en] of Object.entries(HINDI_TO_LATIN_MAP)) {
    if (clean.includes(hi)) {
      clean = clean.split(hi).join(` ${en} `);
    }
  }

  let normalised = clean
    .toLowerCase()
    // Normalize diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace punctuation with spaces
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]\"\'?+]/g, ' ')
    // Collapse multiple whitespace characters into single space
    .replace(/\s+/g, ' ')
    .trim();

  // Strip conversational inquiry prefixes (e.g. "what is dolo", "tell me about paracetamol", "price of dolo")
  normalised = normalised
    .replace(/^(what\s+is\s+the\s+price\s+of|what\s+is\s+price\s+of|what\s+is\s+the\s+rate\s+of|what\s+is\s+a|what\s+is|what\s+are|what's|whats|explain\s+about|explain\s+me\s+about|explain\s+me|explain|tell\s+me\s+about|tell\s+me|price\s+of|cost\s+of|rate\s+of|search\s+for|search|find\s+me|find|show\s+me|give\s+me|i\s+need|i\s+want|looking\s+for|dawa\s+for|dawai\s+for|medicine\s+for)\s+/i, '')
    .replace(/\s+(kya\s+hai|batao|bataiye|ka\s+rate|ka\s+price|ke\s+bare\s+me|ki\s+dawa|ki\s+dawai|tablet|pill|medicine)$/i, '')
    .trim();

  // Common voice phonetic corrections
  if (normalised === 'dollar' || normalised === 'dolor' || normalised === 'dollo' || normalised.startsWith('dollar ') || normalised.startsWith('dolor ')) {
    normalised = normalised.replace(/^(dollar|dolor|dollo)/, 'dolo');
  }

  return normalised;
}

export interface ParsedQuery {
  raw: string;
  normalised: string;
  namePart: string;
  strengthHint?: string;
}

/**
 * Extract medicine name tokens and strength numbers from a query.
 * e.g. "Dolo 650" -> name: "dolo", strength: "650"
 * "Augmentin 625 Duo" -> name: "augmentin duo", strength: "625"
 */
export function parseQuery(query: string): ParsedQuery {
  const norm = normalise(query);

  // Look for numeric strength patterns like 650, 500, 625, 20mg, 500 mg, etc.
  const strengthMatch = norm.match(/\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|u)?\b/i);

  let strengthHint: string | undefined = undefined;
  let namePart = norm;

  if (strengthMatch) {
    strengthHint = strengthMatch[1];
    // Remove the strength from the name part to match molecule/brand name cleanly
    namePart = norm.replace(strengthMatch[0], '').replace(/\s+/g, ' ').trim();
  }

  return {
    raw: query,
    normalised: norm,
    namePart: namePart || norm,
    strengthHint,
  };
}
