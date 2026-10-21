/**
 * Gemma & Gemini OCR Service Module for MediSave
 * 
 * Strict Contract (agents.md & trd.md section 8):
 * - Reads printed medicine names from a user-uploaded image.
 * - Prompt contract: "List only the medicine names printed in this image, as JSON:
 *   {\"names\": [\"...\"]}. Do not add doses, uses, or advice. If nothing is readable return {\"names\": []}."
 * - Defensively parses model output (untrusted text): caps candidate count and length,
 *   strips HTML, and returns sanitized strings.
 * - Never returns prices, molecules, or medical advice.
 * - Supports Google AI Studio (for cloud deployment on Render/Vercel) and Ollama (for local laptop demo).
 */

export interface OcrConfig {
  baseUrl?: string;
  apiKey?: string;
  geminiApiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export interface OcrResult {
  ok: boolean;
  names: string[];
  provider?: 'google-ai' | 'ollama' | 'offline';
  error?: string;
}

const DEFAULT_CONFIG: Required<OcrConfig> = {
  baseUrl: process.env.OLLAMA_API_BASE || 'http://localhost:11434',
  apiKey: process.env.OLLAMA_API_KEY || '',
  geminiApiKey: process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GEMINI_API_KEY || '',
  model: process.env.OLLAMA_MODEL || 'gemma',
  timeoutMs: 60000,
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
      // Fall through to other extraction methods
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
 * Check if an OCR vision endpoint is reachable (Google AI Studio or Ollama).
 * Used by UI to hide the camera button when offline or endpoints are down.
 */
export async function checkOcrAvailability(config?: OcrConfig): Promise<boolean> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 1. If Google AI Studio API key is provided, cloud OCR is available
  if (cfg.geminiApiKey) {
    return true;
  }

  // 2. Otherwise check local Ollama endpoint
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

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
 * Extract medicine names via Google AI Studio Vision API.
 */
function detectMimeType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0K')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Extract medicine names via Google AI Studio Vision API.
 */
/**
 * Extract medicine names via Google AI Studio Vision API.
 * Uses automatic model fallback if one model is experiencing temporary high demand (HTTP 503).
 */
async function extractViaGoogleAI(
  cleanBase64: string,
  apiKey: string,
  timeoutMs: number
): Promise<OcrResult> {
  const modelsToTry = [
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
  ];

  const mimeType = detectMimeType(cleanBase64);
  const payload = {
    contents: [
      {
        parts: [
          { text: OCR_PROMPT },
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  let lastError = '';

  for (const modelName of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000),
      });

      if (response.ok) {
        const data = await response.json();
        const candidatePart = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const names = parseModelResponse(candidatePart);
        return {
          ok: true,
          names,
          provider: 'google-ai',
        };
      }

      // If 503 (high demand) or 404, try the next model
      const errText = await response.text();
      lastError = `HTTP ${response.status}: ${errText.substring(0, 100)}`;
      if (response.status === 503 || response.status === 404 || response.status === 429) {
        continue;
      }

      return {
        ok: false,
        names: [],
        provider: 'google-ai',
        error: `Google AI Studio returned ${lastError}`,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    ok: false,
    names: [],
    provider: 'google-ai',
    error: `Google AI failed across models: ${lastError}`,
  };
}

/**
 * Extract medicine names via Ollama API.
 */
async function extractViaOllama(
  cleanBase64: string,
  cfg: Required<OcrConfig>
): Promise<OcrResult> {
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
        provider: 'ollama',
        error: `Ollama returned HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const rawResponse = data.response || '';
    const names = parseModelResponse(rawResponse);

    return {
      ok: true,
      names,
      provider: 'ollama',
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      names: [],
      provider: 'ollama',
      error: `Ollama service failed: ${message}`,
    };
  }
}

/**
 * Main OCR entrypoint: Extracts candidate medicine names from a medicine box or strip photo.
 *
 * @param imageBase64 Base64 encoded JPEG or PNG (with or without data URL prefix)
 * @param config Optional connection overrides
 */
export async function extractMedicineNamesFromPhoto(
  imageBase64: string,
  config?: OcrConfig
): Promise<OcrResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim();
  if (!cleanBase64) {
    return { ok: false, names: [], error: 'Image data is empty.' };
  }

  // 1. Use Google AI Studio if API key is configured (ideal for Render deployment)
  if (cfg.geminiApiKey) {
    return extractViaGoogleAI(cleanBase64, cfg.geminiApiKey, cfg.timeoutMs);
  }

  // 2. Fall back to local/remote Ollama instance
  return extractViaOllama(cleanBase64, cfg);
}
