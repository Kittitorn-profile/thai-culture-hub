import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { getCraftCategoryCounts } from 'src/server/craft-category-counts';
import { getProvinceCulturalSection } from 'src/server/province-cultural-data';
import { CRAFT_CATEGORIES, normalizeCraftCategory } from 'src/lib/public-cultural-data';

const schema = z.object({
  group: z.enum(['artists', 'heritage', 'ethnic', 'products', 'fabric', 'community', 'crafts']),
  province: z
    .string()
    .default('')
    .refine((value) => !value || provinces.some((p) => p.code === value)),
  category: z
    .string()
    .default('')
    .refine(
      (value) =>
        !value || CRAFT_CATEGORIES.some((item) => item.key === normalizeCraftCategory(value))
    ),
  q: z.string().trim().max(200).default(''),
  countsOnly: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(0).max(10000).default(0),
});
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ยังโหลดชุดข้อมูลไม่ได้' }, { status: 503 });
  const { group, province, q, page, category } = parsed.data;
  const selectedProvince = provinces.find((p) => p.code === province);
  try {
    if (group === 'crafts' && parsed.data.countsOnly === 'true') {
      const counts = await getCraftCategoryCounts(
        db.client,
        province,
        selectedProvince?.name ?? '',
        q
      );
      return NextResponse.json(counts, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }
    const result = await getProvinceCulturalSection(
      db.client,
      province,
      selectedProvince?.name ?? '',
      group === 'products' ? 'cpot' : group,
      page,
      12,
      q,
      ...(group === 'crafts' ? [{ category }] : [])
    );
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { message: 'ยังโหลดชุดข้อมูลนี้ไม่ได้ กรุณาลองอีกครั้ง' },
      { status: 503 }
    );
  }
}
