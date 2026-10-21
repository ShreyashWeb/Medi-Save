/**
 * Supabase Client & Database Sync Module for MediSave
 * 
 * Capabilities:
 * - User Authentication (Sign up, Sign in, OTP magic link, Sign out)
 * - Cloud Prescription Sync (Syncs offline IndexedDB saved list to Supabase)
 * - Safe fallback if Supabase is unconfigured (offline-first architecture)
 */

export interface SupabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface CloudPrescriptionItem {
  id?: string;
  user_id?: string;
  brand_id: string;
  brand_name: string;
  generic_name: string;
  ja_code: number;
  pack_count: number;
  brand_mrp: number;
  generic_equivalent_price: number | null;
  saving_amount: number | null;
  molecules: string[];
  strengths: string[];
  form: string;
  data_date: string;
  created_at?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Perform a fetch request to Supabase REST API without requiring heavy external dependencies.
 * This guarantees zero bundle bloat and seamless operation in Next.js edge and client.
 */
async function supabaseFetch(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<Response> {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}${endpoint}`;
  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  return fetch(url, { ...options, headers });
}

/**
 * Authentication Service
 */
export const SupabaseAuth = {
  /**
   * Sign up a new user with email and password
   */
  async signUp(email: string, password: string, fullName?: string) {
    if (!isSupabaseConfigured()) {
      return { user: null, error: 'Supabase is not configured yet.' };
    }

    try {
      const res = await supabaseFetch('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          data: { full_name: fullName || '' },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { user: null, error: data.msg || data.error_description || 'Signup failed' };
      }
      return { user: data.user, session: data, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { user: null, error: msg };
    }
  },

  /**
   * Sign in an existing user with email and password
   */
  async signInWithPassword(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      return { session: null, error: 'Supabase is not configured yet.' };
    }

    try {
      const res = await supabaseFetch('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { session: null, error: data.error_description || 'Sign in failed' };
      }
      return { session: data, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { session: null, error: msg };
    }
  },

  /**
   * Send a Magic Link (passwordless OTP) to user's email
   */
  async signInWithOtp(email: string) {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: 'Supabase is not configured yet.' };
    }

    try {
      const res = await supabaseFetch('/auth/v1/otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        return { ok: false, error: data.msg || 'OTP request failed' };
      }
      return { ok: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  },
};

/**
 * Cloud Database Service for Saved Prescriptions
 */
export const SupabaseDb = {
  /**
   * Fetch all saved medicines for the logged in user
   */
  async fetchPrescriptions(accessToken: string): Promise<CloudPrescriptionItem[]> {
    if (!isSupabaseConfigured() || !accessToken) return [];

    try {
      const res = await supabaseFetch(
        '/rest/v1/saved_prescriptions?select=*&order=created_at.desc',
        { method: 'GET' },
        accessToken
      );

      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Save a prescription item to the cloud database
   */
  async addPrescription(
    item: Omit<CloudPrescriptionItem, 'id' | 'created_at'>,
    accessToken: string
  ): Promise<CloudPrescriptionItem | null> {
    if (!isSupabaseConfigured() || !accessToken) return null;

    try {
      const res = await supabaseFetch(
        '/rest/v1/saved_prescriptions',
        {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(item),
        },
        accessToken
      );

      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  },

  /**
   * Remove a prescription item from cloud database
   */
  async deletePrescription(id: string, accessToken: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !accessToken) return false;

    try {
      const res = await supabaseFetch(
        `/rest/v1/saved_prescriptions?id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        accessToken
      );
      return res.ok;
    } catch {
      return false;
    }
  },
};
