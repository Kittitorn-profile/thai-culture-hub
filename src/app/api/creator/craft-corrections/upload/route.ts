import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { craftRecordIdSchema } from 'src/lib/craft-corrections';
import { getEditableCraft } from 'src/server/craft-corrections';
import {
  getBearerToken,
  verifyCreatorAccessToken,
  getCreatorProfileByUserId,
} from 'src/server/creator-auth';

export const runtime = 'nodejs';
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
  if (Number(request.headers.get('content-length')) > 2 * 1024 * 1024)
    return NextResponse.json({ message: 'ไฟล์มีขนาดใหญ่เกินไป' }, { status: 413 });
  try {
    const form = await request.formData();
    const id = craftRecordIdSchema.safeParse(form.get('recordId'));
    const file = form.get('file');
    if (!id.success || !(file instanceof File) || !file.size || file.size > 1024 * 1024)
      return NextResponse.json(
        { message: 'กรุณาเลือกรูปภาพขนาดไม่เกิน 1 MB หลังย่อ' },
        { status: 400 }
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    const ext =
      file.type === 'image/jpeg' && jpeg
        ? 'jpg'
        : file.type === 'image/png' && png
          ? 'png'
          : file.type === 'image/webp' && webp
            ? 'webp'
            : null;
    if (!ext)
      return NextResponse.json(
        { message: 'รองรับไฟล์ JPG, PNG และ WebP ที่ถูกต้องเท่านั้น' },
        { status: 400 }
      );
    if (!(await getEditableCraft(auth.supabase, id.data)))
      return NextResponse.json({ message: 'ไม่พบรายการ' }, { status: 404 });
    const bucket = process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets';
    const path = `craft-corrections/${encodeURIComponent(auth.user.id)}/${id.data.replace(':', '/')}/${crypto.randomUUID()}.${ext}`;
    const storage = auth.supabase.storage.from(bucket);
    const { error } = await storage.upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw error;
    return NextResponse.json(
      { data: { url: storage.getPublicUrl(path).data.publicUrl } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ message: 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่' }, { status: 503 });
  }
}
