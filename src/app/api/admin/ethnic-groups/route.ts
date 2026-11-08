import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';
import {
  filterEthnicGroups,
  getEthnicGroupDirectory,
  ETHNIC_GROUPS_SOURCE_URL,
} from 'src/server/ethnic-groups';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const filters = z.object({
  q: z.string().trim().max(200).default(''),
  province: z.string().max(100).default(''),
  group: z.string().max(200).default(''),
  page: z.coerce.number().int().min(0).max(10000).default(0),
  limit: z.coerce
    .number()
    .refine((n) => [20, 50, 100].includes(n))
    .default(20),
});
export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalPlaces)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const parsed = filters.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'เชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  try {
    const records = await getEthnicGroupDirectory(db.client);
    const data = filterEthnicGroups(records, parsed.data);
    const { page, limit } = parsed.data;
    const groups = [...new Set(records.flatMap((item) => item.groups).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'th')
    );
    const provinces = [...new Set(records.map((item) => item.province).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'th')
    );
    return NextResponse.json(
      {
        data: data.slice(page * limit, (page + 1) * limit),
        total: data.length,
        groups,
        provinces,
        coverage: {
          records: records.length,
          groupLabels: groups.length,
          provinces: provinces.length,
        },
        sourceUrl: ETHNIC_GROUPS_SOURCE_URL,
        sources: [
          ...new Map(
            records.map((item) => [item.sourceName, { name: item.sourceName, url: item.sourceUrl }])
          ).values(),
        ],
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'โหลดข้อมูลกลุ่มชาติพันธุ์ไม่สำเร็จ กรุณาลองอีกครั้ง' },
      { status: 503 }
    );
  }
}
