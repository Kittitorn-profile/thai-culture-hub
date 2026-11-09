import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import {
  PROVINCE_DATA_SECTIONS,
  getProvinceCulturalSection,
} from 'src/server/province-cultural-data';

const querySchema = z.object({
  provinceCode: z.string(),
  section: z.enum(PROVINCE_DATA_SECTIONS).optional(),
  page: z.coerce.number().int().min(0).max(10000).default(0),
  pageSize: z.coerce.number().int().min(1).max(30).default(9),
});
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });
  const province = provinces.find((p) => p.code === parsed.data.provinceCode);
  if (!province) return NextResponse.json({ message: 'จังหวัดไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ยังโหลดข้อมูลจังหวัดไม่ได้' }, { status: 503 });
  const { section, page, pageSize } = parsed.data;
  const sections = await Promise.all(
    (section ? [section] : PROVINCE_DATA_SECTIONS).map(async (key) => {
      try {
        return await getProvinceCulturalSection(
          db.client,
          province.code,
          province.name,
          key,
          page,
          pageSize
        );
      } catch {
        return {
          key,
          total: null,
          data: [],
          page,
          pageSize,
          error: 'ยังโหลดชุดข้อมูลนี้ไม่ได้ กรุณาลองอีกครั้ง',
        };
      }
    })
  );
  const complete = sections.every((item) => !('error' in item));
  return NextResponse.json(
    { provinceCode: province.code, provinceName: province.name, sections },
    {
      status: complete || !section ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
