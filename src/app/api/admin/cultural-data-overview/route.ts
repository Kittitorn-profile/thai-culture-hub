import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';
import { getCulturalDataOverview } from 'src/server/cultural-data-overview';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalPlaces)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'เชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  try {
    return NextResponse.json(await getCulturalDataOverview(db.client), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ message: 'โหลดภาพรวมไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 503 });
  }
}
