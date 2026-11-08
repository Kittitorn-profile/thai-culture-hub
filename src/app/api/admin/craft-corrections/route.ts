import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { getBearerToken } from 'src/server/creator-auth';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';
import { CRAFT_REQUEST_SELECT } from 'src/server/craft-corrections';

import { ADMIN_PERMISSION, isSuperAdminRole } from 'src/auth/admin-permissions';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccessToken(getBearerToken(request.headers));
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const canReviewAll =
    isSuperAdminRole(auth.user.role) ||
    auth.user.permissions.includes(ADMIN_PERMISSION.contributions);
  const canReviewCrafts = auth.user.permissions.includes(ADMIN_PERMISSION.culturalHeritage);
  if (!canReviewAll && !canReviewCrafts)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ตรวจข้อเสนอ' }, { status: 403 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ระบบยังไม่พร้อม' }, { status: 503 });
  const status = request.nextUrl.searchParams.get('status') ?? 'pending';
  if (!['pending', 'approved', 'rejected', 'all'].includes(status))
    return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });
  let query = db.client
    .from('craft_correction_requests')
    .select(CRAFT_REQUEST_SELECT)
    .order('created_at', { ascending: false })
    .limit(100);
  if (status !== 'all') query = query.eq('status', status);
  if (!canReviewAll) query = query.or('record_id.like.community:%,record_id.like.fabric:%');
  const { data, error } = await query;
  if (error) return NextResponse.json({ message: 'โหลดคำขอไม่สำเร็จ' }, { status: 503 });
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAccessToken(getBearerToken(request.headers));
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const parsed = z
    .object({
      id: z.string().uuid(),
      decision: z.enum(['approved', 'rejected']),
      note: z.string().trim().max(3000),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  const canReviewAll =
    isSuperAdminRole(auth.user.role) ||
    auth.user.permissions.includes(ADMIN_PERMISSION.contributions);
  const canReviewCrafts = auth.user.permissions.includes(ADMIN_PERMISSION.culturalHeritage);
  if (!canReviewAll && !canReviewCrafts)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ตรวจข้อเสนอ' }, { status: 403 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ระบบยังไม่พร้อม' }, { status: 503 });
  const record = await db.client
    .from('craft_correction_requests')
    .select('record_id')
    .eq('id', parsed.data.id)
    .maybeSingle();
  if (record.error) return NextResponse.json({ message: 'โหลดคำขอไม่สำเร็จ' }, { status: 503 });
  if (!record.data) return NextResponse.json({ message: 'ไม่พบคำขอ' }, { status: 404 });
  if (!canReviewAll && !/^(community|fabric):/.test(record.data.record_id))
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ตรวจประเภทข้อมูลนี้' }, { status: 403 });
  const { data, error } = await db.client.rpc('review_craft_correction', {
    request_id: parsed.data.id,
    decision: parsed.data.decision,
    reviewer_id: auth.user.id,
    reviewer_note: parsed.data.note,
  });
  if (error)
    return NextResponse.json(
      {
        message:
          error.code === '40001'
            ? 'คำขอได้รับการตรวจแล้ว หรือข้อมูลเปลี่ยนหลังส่ง กรุณาตรวจข้อมูลล่าสุดและให้สมาชิกส่งใหม่'
            : 'ตรวจคำขอไม่สำเร็จ กรุณาลองใหม่',
      },
      { status: error.code === '40001' ? 409 : 503 }
    );
  return NextResponse.json({ data });
}
