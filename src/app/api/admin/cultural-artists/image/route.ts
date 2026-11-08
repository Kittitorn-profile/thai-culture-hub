import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';
import { type ArtistDirectory, ARTIST_DIRECTORY_SECTION_KEY } from 'src/server/cultural-artists';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const metadata = z.object({
  artistId: z.string().min(1).max(100),
  credit: z.string().trim().min(1).max(200),
  sourceUrl: z.union([
    z.literal(''),
    z
      .string()
      .url()
      .refine((url) => url.startsWith('https://')),
  ]),
});
const bucket = process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalArtists)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const parsed = metadata.safeParse({
    artistId: form?.get('artistId'),
    credit: form?.get('credit'),
    sourceUrl: form?.get('sourceUrl') ?? '',
  });
  const file = form?.get('file');
  if (!parsed.success || !(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024)
    return NextResponse.json(
      { message: 'กรุณาระบุเครดิต และเลือกรูป JPG, PNG หรือ WebP ไม่เกิน 2 MB' },
      { status: 400 }
    );
  const buffer = Buffer.from(await file.arrayBuffer());
  const valid =
    (file.type === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) ||
    (file.type === 'image/png' &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (file.type === 'image/webp' &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP');
  if (!valid) return NextResponse.json({ message: 'ชนิดไฟล์รูปภาพไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ยังเชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  const table = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
  const current = await db.client
    .from(table)
    .select('content,updated_at')
    .eq('section_key', ARTIST_DIRECTORY_SECTION_KEY)
    .single();
  if (current.error || !current.data)
    return NextResponse.json({ message: 'โหลดข้อมูลไม่สำเร็จ' }, { status: 503 });
  const directory = current.data.content as ArtistDirectory;
  const artist = directory.artists.find((item) => item.id === parsed.data.artistId);
  if (!artist) return NextResponse.json({ message: 'ไม่พบศิลปิน' }, { status: 404 });
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const path = `cultural-artists/${artist.id}/${crypto.randomUUID()}.${extension}`;
  const storage = db.client.storage.from(bucket);
  const uploaded = await storage.upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploaded.error)
    return NextResponse.json({ message: 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  const { data } = storage.getPublicUrl(path);
  artist.image = {
    url: data.publicUrl,
    credit: parsed.data.credit,
    ...(parsed.data.sourceUrl ? { sourceUrl: parsed.data.sourceUrl } : {}),
  };
  const saved = await db.client
    .from(table)
    .update({ content: directory, updated_at: new Date().toISOString() })
    .eq('section_key', ARTIST_DIRECTORY_SECTION_KEY)
    .eq('updated_at', current.data.updated_at)
    .select('section_key');
  if (saved.error || !saved.data?.length) {
    await storage.remove([path]);
    return NextResponse.json(
      { message: 'ข้อมูลเปลี่ยนระหว่างบันทึก กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง' },
      { status: 409 }
    );
  }
  return NextResponse.json({ data: artist }, { headers: { 'Cache-Control': 'no-store' } });
}
