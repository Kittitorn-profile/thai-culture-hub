import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';
import { getCulturalDataInventory } from 'src/server/cultural-data-inventory';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalPlaces)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const code = request.nextUrl.searchParams.get('provinceCode') ?? '';
  const province = provinces.find((item) => item.code === code);
  if (code && !province)
    return NextResponse.json({ message: 'จังหวัดไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'เชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  try {
    return NextResponse.json(
      await getCulturalDataInventory(db.client, code, province?.name ?? ''),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'อ่านจำนวนข้อมูลไม่ได้ กรุณาลองอีกครั้ง' },
      { status: 503 }
    );
  }
}
