import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';
import { getDatasetVisibility } from 'src/server/dataset-visibility';
import { getCulturalDataOverview } from 'src/server/cultural-data-overview';
import {
  SOURCE_KEYS,
  DATASET_VISIBILITY_KEY,
  datasetVisibilitySchema,
} from 'src/lib/dataset-visibility';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalPlaces)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'เชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  try {
    return NextResponse.json(
      { ...(await getCulturalDataOverview(db.client)), visibility: await getDatasetVisibility() },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch {
    return NextResponse.json({ message: 'โหลดภาพรวมไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalPlaces)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const parsed = datasetVisibilitySchema.safeParse(await request.json().catch(() => null));
  if (
    !parsed.success ||
    parsed.data.hidden.some((key) => !SOURCE_KEYS.includes(key as (typeof SOURCE_KEYS)[number]))
  )
    return NextResponse.json({ message: 'สถานะชุดข้อมูลไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'เชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  const { error } = await db.client
    .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
    .upsert(
      {
        section_key: DATASET_VISIBILITY_KEY,
        content: { hidden: [...new Set(parsed.data.hidden)] },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'section_key' }
    );
  if (error) return NextResponse.json({ message: 'บันทึกสถานะไม่สำเร็จ' }, { status: 503 });
  return NextResponse.json(parsed.data, { headers: { 'Cache-Control': 'no-store' } });
}
