/**
 * Gemma OCR Service Module for MediSave
 * 
 * Strict Contract:
 * - Reads printed medicine names from a user-uploaded image.
 * - Prompt contract: "List only the medicine names printed in this image, as JSON:
 *   {\"names\": [\"...\"]}. Do not add doses, uses, or advice. If nothing is readable return {\"names\": []}."
 * - Defensively parses model output (untrusted text): caps candidate count and length,
 *   strips HTML, and returns sanitized strings.
 * - Never returns prices, molecules, or medical advice.
 */

export interface OcrConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export interface OcrResult {
  ok: boolean;
  names: string[];
  error?: string;
}

const DEFAULT_CONFIG: Required<OcrConfig> = {
  baseUrl: process.env.OLLAMA_API_BASE || 'http://localhost:11434',
  apiKey: process.env.OLLAMA_API_KEY || '',
  model: process.env.OLLAMA_MODEL || 'gemma',
  timeoutMs: 15000,
};

const OCR_PROMPT = `List only the medicine names printed in this image, as JSON: {"names": ["..."]}. Do not add doses, uses, or advice. If nothing is readable return {"names": []}.`;

/**
 * Clean and sanitize untrusted candidate strings from the model.
 */
export function sanitizeCandidates(rawNames: unknown): string[] {
  if (!Array.isArray(rawNames)) {
    return [];
  }

  const sanitized: string[] = [];
  const seen = new Set<string>();

  for (const item of rawNames) {
    if (typeof item !== 'string') continue;

    // Strip script/style blocks along with their inner contents
    let clean = item
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      // Strip any other HTML tags
      .replace(/<[^>]+>/g, '')
      .replace(/[\r\n\t]+/g, ' ')
      .trim();

    // Cap candidate string length to 60 characters
    if (clean.length > 60) {
      clean = clean.substring(0, 60).trim();
    }

    // Filter out empty or conversational output
    if (!clean || clean.length < 2) continue;

    const lower = clean.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      sanitized.push(clean);
    }

    // Cap total candidate names to at most 10
    if (sanitized.length >= 10) break;
  }

  return sanitized;
}

/**
 * Parse untrusted raw model response text into candidate medicine names.
 */
export function parseModelResponse(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  // 1. Try finding a JSON block within markdown or surrounding text
  const jsonMatch = rawText.match(/\{[\s\S]*"names"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && Array.isArray(parsed.names)) {
        return sanitizeCandidates(parsed.names);
      }
    } catch {
      // JSON parse error, fall back to line matching below
    }
  }

  // 2. Direct JSON attempt
  try {
    const directParsed = JSON.parse(rawText.trim());
    if (directParsed && Array.isArray(directParsed.names)) {
      return sanitizeCandidates(directParsed.names);
    }
  } catch {
    // Continue to fallback
  }

  // 3. Fallback: line-by-line extraction if JSON was malformed
  const lines = rawText.split('\n');
  const candidateList: string[] = [];
  for (const line of lines) {
    const match = line.match(/^[-*•\d\.\s]*"([^"]+)"/) || line.match(/^[-*•\d\.\s]+([A-Za-z0-9\s\-]+)$/);
    if (match && match[1]) {
      candidateList.push(match[1]);
    }
  }

  return sanitizeCandidates(candidateList);
}

/**
 * Check if the Ollama endpoint is reachable.
 * Used by UI to hide the camera button when offline or endpoint is down.
 */
export async function checkOcrAvailability(config?: OcrConfig): Promise<boolean> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const headers: Record<string, string> = {};
    if (cfg.apiKey) {
      headers['Authorization'] = `Bearer ${cfg.apiKey}`;
    }

    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/tags`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Send an image to Gemma via Ollama API and return candidate medicine names.
 *
 * @param imageBase64 Base64 encoded JPEG or PNG (with or without data URL prefix)
 * @param config Optional Ollama connection configuration
 */
export async function extractMedicineNamesFromPhoto(
  imageBase64: string,
  config?: OcrConfig
): Promise<OcrResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Strip data URL scheme if present (e.g. "data:image/jpeg;base64,")
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim();

  if (!cleanBase64) {
    return { ok: false, names: [], error: 'Image data is empty.' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cfg.apiKey) {
      headers['Authorization'] = `Bearer ${cfg.apiKey}`;
    }

    const payload = {
      model: cfg.model,
      prompt: OCR_PROMPT,
      images: [cleanBase64],
      stream: false,
      format: 'json',
    };

    const endpoint = `${cfg.baseUrl.replace(/\/$/, '')}/api/generate`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        ok: false,
        names: [],
        error: `Ollama returned HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const rawResponse = data.response || '';
    const names = parseModelResponse(rawResponse);

    return {
      ok: true,
      names,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      names: [],
      error: `OCR service failed: ${message}`,
    };
  }
}
