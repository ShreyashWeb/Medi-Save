import { NextRequest, NextResponse } from 'next/server';
import { extractMedicineNamesFromPhoto, checkOcrAvailability } from '../../../lib/ocr';

/**
 * GET /api/ocr
 * Health check to verify if Ollama Gemma service is reachable.
 * Used by UI to determine whether to show or hide the camera button.
 */
export async function GET() {
  try {
    const available = await checkOcrAvailability();
    return NextResponse.json({ available });
  } catch {
    return NextResponse.json({ available: false }, { status: 200 });
  }
}

/**
 * POST /api/ocr
 * Secure server-side proxy for Gemma photo OCR via Ollama.
 * Keeps OLLAMA_API_KEY and backend URL protected from browser exposure.
 *
 * Payload: { imageBase64: string }
 * Response: { ok: boolean, names: string[], error?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { ok: false, names: [], error: 'imageBase64 string is required.' },
        { status: 400 }
      );
    }

    const result = await extractMedicineNamesFromPhoto(imageBase64);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, names: [], error: `Server error during OCR: ${msg}` },
      { status: 500 }
    );
  }
}
