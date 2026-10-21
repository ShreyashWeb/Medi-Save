import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAuth } from '../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, fullName } = body;

    if (action === 'signin_password') {
      const res = await SupabaseAuth.signInWithPassword(email, password);
      return NextResponse.json(
        { ok: !res.error, ...res },
        { status: res.error ? 400 : 200 }
      );
    }

    if (action === 'signup') {
      const res = await SupabaseAuth.signUp(email, password, fullName);
      return NextResponse.json(
        { ok: !res.error, ...res },
        { status: res.error ? 400 : 200 }
      );
    }

    if (action === 'send_otp') {
      const res = await SupabaseAuth.signInWithOtp(email);
      return NextResponse.json(
        { ok: res.ok, error: res.error },
        { status: res.ok ? 200 : 400 }
      );
    }

    return NextResponse.json({ ok: false, error: 'Invalid auth action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
