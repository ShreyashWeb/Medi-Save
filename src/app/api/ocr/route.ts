import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}
import { extractMedicineNamesFromPhoto, checkOcrAvailability } from '../../../lib/ocr';

/**
 * GET /api/ocr
 * Health check to verify if Gemma vision service is reachable.
 */
export async function GET() {
  try {
    const available = await checkOcrAvailability();
    const hasGoogleKey = !!(process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GEMINI_API_KEY);
    return NextResponse.json({
      available,
      model: hasGoogleKey ? 'gemma-4-26b-a4b-it' : 'ollama-gemma',
      provider: hasGoogleKey ? 'Google AI Studio (Gemma 4)' : 'Ollama Local',
    });
  } catch {
    return NextResponse.json({ available: false }, { status: 200 });
  }
}

/**
 * POST /api/ocr
 * Accepts either:
 * 1. JSON: { imageBase64: string }
 * 2. Multipart FormData: file: File (image/jpeg, png, webp)
 */
export async function POST(req: NextRequest) {
  try {
    let base64Data = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json(
          { ok: false, names: [], items: [], error: 'No file uploaded in form data' },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      base64Data = buffer.toString('base64');
    } else {
      const body = await req.json().catch(() => ({}));
      base64Data = body.imageBase64 || '';
    }

    if (!base64Data) {
      return NextResponse.json(
        { ok: false, names: [], items: [], error: 'Image data is required (imageBase64 or file)' },
        { status: 400 }
      );
    }

    const result = await extractMedicineNamesFromPhoto(base64Data);

    const items = result.names.map((name) => ({
      brand_name: name,
      molecule: '',
      strength: '',
      form: '',
      raw_text: name,
    }));

    return NextResponse.json(
      {
        ok: result.ok,
        success: result.ok,
        names: result.names,
        items,
        model_used: 'Gemma 4 (Google AI Studio)',
        error: result.error,
        warning: result.ok && result.names.length === 0
          ? 'No clear medicine names detected in the photo. Please verify lighting or enter medicine name manually.'
          : undefined,
      },
      { status: result.ok ? 200 : 502 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, success: false, names: [], items: [], error: `Server error during OCR: ${msg}` },
      { status: 500 }
    );
  }
}
