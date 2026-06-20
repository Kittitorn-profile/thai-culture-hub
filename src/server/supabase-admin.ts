import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------

let supabaseAdmin: SupabaseClient | null = null;

type SupabaseAdminResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: string };

export function getSupabaseAdmin(): SupabaseAdminResult {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PRIVATE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return { ok: false, error: 'Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL' };
  }

  if (!supabaseServiceRoleKey) {
    return {
      ok: false,
      error: 'Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY',
    };
  }

  supabaseAdmin ??= createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return { ok: true, client: supabaseAdmin };
}
