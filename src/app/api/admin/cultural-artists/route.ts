import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';
import { artistBirthDateSchema } from 'src/lib/cultural-artist-form';
import {
  ARTIST_TYPES,
  directorySchema,
  type CulturalArtist,
  ARTIST_DIRECTORY_SECTION_KEY,
} from 'src/server/cultural-artists';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const url = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//.test(value));
const schema = z
  .object({
    birthDate: artistBirthDateSchema.optional(),
    id: z.string().min(1).max(100).optional(),
    removeImage: z.boolean().optional(),
    name: z.string().trim().min(1).max(200),
    aliases: z.array(z.string().trim().min(1).max(200)).max(30),
    types: z.array(z.enum(ARTIST_TYPES)).min(1).max(6),
    fields: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
    genres: z.array(z.string().trim().min(1).max(100)).max(30),
    sourceUrl: url,
    provinceCode: z.string().refine((code) => !code || provinces.some((p) => p.code === code)),
    relationship: z.enum(['birthplace', 'origin', 'work_area', 'learning_site', 'cultural_legacy']),
    provinceSourceUrl: z.union([z.literal(''), url]),
  })
  .refine((value) => !value.provinceCode || !!value.provinceSourceUrl);

export async function POST(request: NextRequest) {
  return saveArtist(request, false);
}

export async function PATCH(request: NextRequest) {
  return saveArtist(request, true);
}

async function saveArtist(request: NextRequest, editing: boolean) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalArtists)))
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const multipart = request.headers?.get('content-type')?.includes('multipart/form-data');
  const form = multipart ? await request.formData().catch(() => null) : null;
  const body = multipart
    ? (() => {
        try {
          return JSON.parse(String(form?.get('data') ?? ''));
        } catch {
          return null;
        }
      })()
    : await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || (editing && !parsed.data.id))
    return NextResponse.json(
      {
        message:
          'กรุณากรอกชื่อ ประเภท สาขา และแหล่งอ้างอิงให้ครบ หากเลือกจังหวัดต้องระบุหลักฐานจังหวัดด้วย',
      },
      { status: 400 }
    );
  const file = form?.get('file');
  let imageBuffer: Buffer | undefined;
  const imageMetadata = z
    .object({
      credit: z.string().trim().min(1).max(200),
      sourceUrl: z.union([
        z.literal(''),
        z
          .string()
          .trim()
          .url()
          .refine((value) => value.startsWith('https://')),
      ]),
    })
    .safeParse({ credit: form?.get('credit'), sourceUrl: form?.get('imageSourceUrl') ?? '' });
  if (file != null) {
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 2 * 1024 * 1024 ||
      !imageMetadata.success
    )
      return NextResponse.json(
        { message: 'กรุณาระบุเครดิต และเลือกรูป JPG, PNG หรือ WebP ไม่เกิน 2 MB' },
        { status: 400 }
      );
    imageBuffer = Buffer.from(await file.arrayBuffer());
    const valid =
      (file.type === 'image/jpeg' &&
        imageBuffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) ||
      (file.type === 'image/png' &&
        imageBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (file.type === 'image/webp' &&
        imageBuffer.toString('ascii', 0, 4) === 'RIFF' &&
        imageBuffer.toString('ascii', 8, 12) === 'WEBP');
    if (!valid) return NextResponse.json({ message: 'ชนิดไฟล์รูปภาพไม่ถูกต้อง' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'ยังเชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  const table = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
  const current = await db.client
    .from(table)
    .select('content,updated_at')
    .eq('section_key', ARTIST_DIRECTORY_SECTION_KEY)
    .single();
  const directory = directorySchema.safeParse(current.data?.content);
  if (current.error || !directory.success)
    return NextResponse.json({ message: 'โหลดข้อมูลไม่สำเร็จ' }, { status: 503 });
  const input = parsed.data;
  const existing = editing
    ? directory.data.artists.find((item) => item.id === input.id)
    : undefined;
  if (editing && !existing) return NextResponse.json({ message: 'ไม่พบศิลปิน' }, { status: 404 });
  const identity = (name: string) => name.normalize('NFC').trim().toLocaleLowerCase('th');
  const names = new Set([input.name, ...input.aliases].map(identity));
  if (
    directory.data.artists.some(
      (artist) =>
        artist.id !== existing?.id &&
        [artist.name, ...artist.aliases].some((name) => names.has(identity(name)))
    )
  )
    return NextResponse.json(
      { message: 'มีชื่อศิลปินหรือชื่อที่ใช้แสดงนี้แล้ว กรุณาตรวจสอบรายการเดิม' },
      { status: 409 }
    );
  const province = provinces.find((item) => item.code === input.provinceCode);
  const artist: CulturalArtist = {
    ...existing,
    id: existing?.id ?? `manual-${crypto.randomUUID()}`,
    birthDate: input.birthDate ?? existing?.birthDate,
    name: input.name,
    aliases: input.aliases,
    types: [...new Set(input.types)],
    fields: input.fields,
    genres: input.genres,
    provinceStatus: province ? ('verified' as const) : ('pending_verification' as const),
    provinceAssociations: province
      ? [
          {
            ...(existing?.provinceAssociations[0]?.provinceCode === province.code
              ? existing.provinceAssociations[0]
              : {}),
            provinceCode: province.code,
            provinceName: province.name,
            relationship: input.relationship,
            sourceUrl: input.provinceSourceUrl,
          },
        ]
      : [],
    recognitions: existing?.recognitions ?? [],
    sources: existing
      ? [
          {
            ...existing.sources[0],
            datasetKey: existing.sources[0]?.datasetKey ?? 'admin-manual',
            url: input.sourceUrl,
          },
          ...existing.sources.slice(1),
        ]
      : [{ datasetKey: 'admin-manual', url: input.sourceUrl }],
  };
  if (existing) {
    artist.provinceAssociations.push(...existing.provinceAssociations.slice(1));
    artist.provinceStatus = artist.provinceAssociations.length
      ? 'verified'
      : 'pending_verification';
  }
  if (input.removeImage) delete artist.image;
  if (artist.image && file == null && form) {
    if (!imageMetadata.success)
      return NextResponse.json(
        { message: 'กรุณาระบุเครดิตภาพและลิงก์แหล่งภาพให้ถูกต้อง' },
        { status: 400 }
      );
    artist.image = {
      url: artist.image.url,
      credit: imageMetadata.data.credit,
      ...(imageMetadata.data.sourceUrl ? { sourceUrl: imageMetadata.data.sourceUrl } : {}),
    };
  }
  const storage = db.client.storage?.from(process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets');
  let imagePath: string | undefined;
  if (file instanceof File && imageBuffer && imageMetadata.success) {
    const extension =
      file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
    imagePath = `cultural-artists/${artist.id}/${crypto.randomUUID()}.${extension}`;
    const uploaded = await storage!.upload(imagePath, imageBuffer, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error)
      return NextResponse.json({ message: 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
    artist.image = {
      url: storage!.getPublicUrl(imagePath).data.publicUrl,
      credit: imageMetadata.data.credit,
      ...(imageMetadata.data.sourceUrl ? { sourceUrl: imageMetadata.data.sourceUrl } : {}),
    };
  }
  if (existing)
    directory.data.artists[directory.data.artists.findIndex((item) => item.id === existing.id)] =
      artist;
  else directory.data.artists.push(artist);
  const saved = await db.client
    .from(table)
    .update({ content: directory.data, updated_at: new Date().toISOString() })
    .eq('section_key', ARTIST_DIRECTORY_SECTION_KEY)
    .eq('updated_at', current.data.updated_at)
    .select('section_key');
  if (saved.error || !saved.data?.length) {
    if (imagePath) await storage!.remove([imagePath]);
    return NextResponse.json(
      { message: 'ข้อมูลเปลี่ยนระหว่างบันทึก กรุณาลองใหม่อีกครั้ง' },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { data: artist },
    { status: editing ? 200 : 201, headers: { 'Cache-Control': 'no-store' } }
  );
}
