import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { getProvinceCulturalSection } from 'src/server/province-cultural-data';

const schema = z.object({
  group: z.enum(['artists', 'heritage', 'ethnic', 'products', 'fabric', 'community']),
  province: z
    .string()
    .default('')
    .refine((value) => !value || provinces.some((p) => p.code === value)),
  q: z.string().trim().max(200).default(''),
  page: z.coerce.number().int().min(0).max(10000).default(0),
});
export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ยังโหลดชุดข้อมูลไม่ได้' }, { status: 503 });
  const { group, province, q, page } = parsed.data;
  const selectedProvince = provinces.find((p) => p.code === province);
  try {
    const result = await getProvinceCulturalSection(
      db.client,
      province,
      selectedProvince?.name ?? '',
      group === 'products' ? 'cpot' : group,
      page,
      12,
      q
    );
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json(
      { message: 'ยังโหลดชุดข้อมูลนี้ไม่ได้ กรุณาลองอีกครั้ง' },
      { status: 503 }
    );
  }
}
