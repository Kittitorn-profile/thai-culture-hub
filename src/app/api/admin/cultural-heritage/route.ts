import { NextResponse } from 'next/server';

import { verifyAdminAccessToken } from 'src/server/admin-api-auth';
import { getCulturalHeritage } from 'src/server/cultural-heritage';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
  const auth = await verifyAdminAccessToken(token, ADMIN_PERMISSION.culturalHeritage);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') ?? 0);
  const limit = Number(params.get('limit') ?? 20);
  const collection = params.get('collection') ?? 'registry';
  const category = (params.get('category') ?? '').trim();
  const query = (params.get('q') ?? '').trim();
  const province = (params.get('province') ?? '').trim();
  if (
    !['registry', 'community'].includes(collection) ||
    !Number.isInteger(page) ||
    page < 0 ||
    page > 10000 ||
    ![20, 50, 100].includes(limit) ||
    category.length > 100 ||
    query.length > 200 ||
    province.length > 100
  )
    return NextResponse.json({ message: 'กรุณาตรวจสอบคำค้นหาและหน้าที่เลือก' }, { status: 400 });
  try {
    return NextResponse.json(
      await getCulturalHeritage({
        query,
        province,
        page,
        limit,
        collection: collection as 'registry' | 'community',
        category,
      }),
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ' },
      { status: 502 }
    );
  }
}
