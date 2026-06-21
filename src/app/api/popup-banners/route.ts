import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const TABLE_NAME = process.env.POPUP_BANNERS_TABLE ?? 'popup_banners';

type PopupBannerRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  button_label?: string | null;
  button_url?: string | null;
  dismissible?: boolean | null;
  show_once?: boolean | null;
  updated_at?: string | null;
};

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: null, message: supabase.error }, { status: 200 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select(
      'id, title, description, image_url, button_label, button_url, dismissible, show_once, updated_at'
    )
    .eq('is_active', true)
    .not('image_url', 'is', null)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ data: null, message: error.message }, { status: 200 });
  }

  return NextResponse.json({ data: (data ?? null) as PopupBannerRow | null });
}
