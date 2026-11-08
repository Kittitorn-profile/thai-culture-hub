import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';
import { readHomeHeroRecords, mutateHomeHeroRecord } from 'src/server/home-hero-crud';
import { HomeHeroOperationError, homeHeroOperationSchema } from 'src/lib/home-hero-crud';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ระบบยังไม่พร้อมใช้งาน' }, { status: 503 });
  try {
    return NextResponse.json(
      { images: await readHomeHeroRecords(db.client) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ message: 'โหลดภาพไม่สำเร็จ กรุณาลองใหม่' }, { status: 503 });
  }
}
async function write(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const parsed = homeHeroOperationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'ข้อมูลภาพไม่ถูกต้อง' },
      { status: 400 }
    );
  const expectedMethod =
    parsed.data.action === 'create' ? 'POST' : parsed.data.action === 'delete' ? 'DELETE' : 'PATCH';
  if (request.method !== expectedMethod)
    return NextResponse.json({ message: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ระบบยังไม่พร้อมใช้งาน' }, { status: 503 });
  try {
    return NextResponse.json({ images: await mutateHomeHeroRecord(db.client, parsed.data) });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof HomeHeroOperationError
            ? error.message
            : 'บันทึกภาพไม่สำเร็จ กรุณาลองใหม่',
      },
      { status: error instanceof HomeHeroOperationError ? error.status : 503 }
    );
  }
}
export const POST = write;
export const PATCH = write;
export const DELETE = write;
