import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getEditableCraft, CRAFT_REQUEST_SELECT } from 'src/server/craft-corrections';
import { craftRecordIdSchema, craftSubmissionSchema } from 'src/lib/craft-corrections';
import {
  getBearerToken,
  verifyCreatorAccessToken,
  getCreatorProfileByUserId,
} from 'src/server/creator-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const recordId = request.nextUrl.searchParams.get('recordId');
  if (recordId !== null && !craftRecordIdSchema.safeParse(recordId).success)
    return NextResponse.json({ message: 'รายการไม่ถูกต้อง' }, { status: 400 });
  try {
    if (recordId === null) {
      const { data, error } = await auth.supabase
        .from('craft_correction_requests')
        .select(CRAFT_REQUEST_SELECT)
        .eq('requester_user_id', auth.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json(
        { requests: data ?? [] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const item = await getEditableCraft(auth.supabase, recordId!);
    if (!item) return NextResponse.json({ message: 'ไม่พบรายการ' }, { status: 404 });
    const { data, error } = await auth.supabase
      .from('craft_correction_requests')
      .select(CRAFT_REQUEST_SELECT)
      .eq('requester_user_id', auth.user.id)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return NextResponse.json(
      { item, requests: data ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'โหลดข้อมูลสำหรับแก้ไขไม่ได้ กรุณาลองใหม่' },
      { status: 503 }
    );
  }
}
export async function POST(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const profile = await getCreatorProfileByUserId(auth.user.id);
  if (!profile.ok)
    return NextResponse.json({ message: profile.message }, { status: profile.status });
  if (profile.profile.status !== 'approved' || profile.profile.is_active === false)
    return NextResponse.json(
      { message: 'บัญชีสมาชิกยังไม่ได้รับอนุมัติหรือถูกระงับ' },
      { status: 403 }
    );
  const parsed = craftSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' },
      { status: 400 }
    );
  try {
    const { recordId, values, reason, revision } = parsed.data;
    const item = await getEditableCraft(auth.supabase, recordId);
    if (!item) return NextResponse.json({ message: 'ไม่พบรายการ' }, { status: 404 });
    if (item.revision !== revision)
      return NextResponse.json(
        { message: 'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่ก่อนส่ง' },
        { status: 409 }
      );
    const changes = Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(item.values[key as keyof typeof values])
      )
    );
    if (!Object.keys(changes).length)
      return NextResponse.json(
        { message: 'กรุณาแก้ไขหรือเพิ่มเติมข้อมูลอย่างน้อยหนึ่งช่อง' },
        { status: 400 }
      );
    const { data, error } = await auth.supabase
      .from('craft_correction_requests')
      .insert({
        record_id: recordId,
        record_title: item.title,
        requester_user_id: auth.user.id,
        requester_name: profile.profile.display_name,
        reason,
        original_snapshot: item.values,
        suggested_payload: changes,
        base_revision: revision,
      })
      .select(CRAFT_REQUEST_SELECT)
      .single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'ส่งข้อเสนอไม่สำเร็จ กรุณาลองใหม่' }, { status: 503 });
  }
}
