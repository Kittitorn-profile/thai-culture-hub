import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { developersSchema, DEVELOPERS_SECTION_KEY } from 'src/lib/contact-developers';

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase.ok) return NextResponse.json({ message: 'โหลดข้อมูลไม่สำเร็จ' }, { status: 500 });
  const { data, error } = await supabase.client
    .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
    .select('content')
    .eq('section_key', DEVELOPERS_SECTION_KEY)
    .maybeSingle();
  if (error) return NextResponse.json({ message: 'โหลดข้อมูลไม่สำเร็จ' }, { status: 500 });
  const result = developersSchema.safeParse(data?.content ?? { developers: [] });
  if (!result.success) return NextResponse.json({ message: 'ข้อมูลไม่ถูกต้อง' }, { status: 500 });
  return NextResponse.json({
    data: result.data.developers.filter((developer) => developer.isPublished),
  });
}
