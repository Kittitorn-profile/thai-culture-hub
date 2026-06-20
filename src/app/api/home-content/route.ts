import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const TABLE_NAME = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';

type HomeContentRow = {
  section_key: string;
  content: unknown;
  updated_at?: string | null;
};

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: {}, message: supabase.error }, { status: 200 });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('section_key, content, updated_at');

  if (error) {
    return NextResponse.json({ data: {}, message: error.message }, { status: 200 });
  }

  const sections = Object.fromEntries(
    ((data ?? []) as HomeContentRow[]).map((row) => [row.section_key, row.content])
  );

  return NextResponse.json({ data: sections });
}

