import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDb, type CloudPrescriptionItem } from '../../../lib/supabase';

function getAuthToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function GET(req: NextRequest) {
  const token = getAuthToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized: Bearer token required' }, { status: 401 });
  }

  const items = await SupabaseDb.fetchPrescriptions(token);
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const token = getAuthToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized: Bearer token required' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Omit<CloudPrescriptionItem, 'id' | 'created_at'>;
    const item = await SupabaseDb.addPrescription(body, token);
    if (!item) {
      return NextResponse.json({ ok: false, error: 'Failed to save prescription' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = getAuthToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized: Bearer token required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Prescription ID required' }, { status: 400 });
  }

  const success = await SupabaseDb.deletePrescription(id, token);
  return NextResponse.json({ ok: success });
}
