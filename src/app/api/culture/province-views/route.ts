import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

export async function GET(request: NextRequest) {
  const provinceCode = request.nextUrl.searchParams.get('provinceCode') ?? '';
  if (!/^TH-\d{2}$/.test(provinceCode)) {
    return NextResponse.json({ message: 'Invalid province code' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase.ok) {
    return NextResponse.json({ message: 'Unable to load views' }, { status: 500 });
  }

  const path = `/province/${provinceCode}`;
  const { count, error } = await supabase.client
    .from('visitor_page_views')
    .select('id', { count: 'exact', head: true })
    .or(`path.eq.${path},path.eq.${path}/,path.like.${path}?*,path.like.${path}/?*`);

  if (error) {
    return NextResponse.json({ message: 'Unable to load views' }, { status: 500 });
  }

  return NextResponse.json({ views: count ?? 0 });
}
