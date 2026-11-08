import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};
export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || !TYPES[file.type]) {
    return NextResponse.json({ message: 'รองรับรูป JPG, PNG, WebP และ AVIF' }, { status: 400 });
  }
  if (!file.size || file.size > 1024 * 1024) {
    return NextResponse.json({ message: 'รูปภาพหลังย่อต้องมีขนาดไม่เกิน 1 MB' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db.ok)
    return NextResponse.json({ message: 'ระบบอัปโหลดยังไม่พร้อมใช้งาน' }, { status: 503 });
  const bucket =
    process.env.HOME_HERO_ASSETS_BUCKET ?? process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets';
  const path = `home-hero/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const storage = db.client.storage.from(bucket);
  const { error } = await storage.upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false,
  });
  if (error)
    return NextResponse.json({ message: 'อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 500 });
  return NextResponse.json({ data: { url: storage.getPublicUrl(path).data.publicUrl } });
}
