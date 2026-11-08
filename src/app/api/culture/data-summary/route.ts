import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { getCulturalDataSummary } from 'src/server/cultural-data-summary';

export async function GET() {
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ยังโหลดสรุปข้อมูลไม่ได้' }, { status: 503 });
  const summary = await getCulturalDataSummary(db.client);
  return NextResponse.json(summary, {
    headers: {
      'Cache-Control': summary.complete
        ? 'public, s-maxage=300, stale-while-revalidate=300'
        : 'no-store',
    },
  });
}
