import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const TABLE_NAME = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
const ALLOWED_SECTION_KEYS = new Set(['story-media', 'local-wisdom', 'culture-categories']);

type HomeContentRow = {
  section_key: string;
  content: unknown;
  updated_at?: string | null;
};

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const sectionKey = request.nextUrl.searchParams.get('sectionKey')?.trim();
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  if (sectionKey) {
    if (!ALLOWED_SECTION_KEYS.has(sectionKey)) {
      return NextResponse.json({ message: 'Invalid sectionKey' }, { status: 400 });
    }

    const { data, error } = await supabase.client
      .from(TABLE_NAME)
      .select('section_key, content, updated_at')
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? null });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('section_key, content, updated_at');

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []) as HomeContentRow[] });
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sectionKey?: string;
    content?: unknown;
  };
  const sectionKey = body.sectionKey?.trim();

  if (!sectionKey || !ALLOWED_SECTION_KEYS.has(sectionKey)) {
    return NextResponse.json({ message: 'Invalid sectionKey' }, { status: 400 });
  }

  if (!body.content || typeof body.content !== 'object') {
    return NextResponse.json({ message: 'content object is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .upsert(
      {
        section_key: sectionKey,
        content: body.content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'section_key' }
    )
    .select('section_key, content, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
