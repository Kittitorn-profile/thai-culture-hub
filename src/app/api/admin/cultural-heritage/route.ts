import { z } from 'zod';
import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { COMMUNITY_GROUPS } from 'src/lib/cultural-data-groups';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';
import { getCulturalHeritage } from 'src/server/cultural-heritage';
import { COMMUNITY_EDITS_KEY, communityHeritageSchema } from 'src/lib/community-heritage-form';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

import communityCrafts from '../../../../../data/cultural-heritage/community-crafts.json';
import communityWeaving from '../../../../../data/cultural-heritage/community-weaving.json';

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

async function saveCommunity(request: Request, editing: boolean) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
  const auth = await verifyAdminAccessToken(token, ADMIN_PERMISSION.culturalHeritage);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const multipart = request.headers.get('content-type')?.includes('multipart/form-data');
  const form = multipart ? await request.formData().catch(() => null) : null;
  let body: unknown;
  try {
    body = multipart ? JSON.parse(String(form?.get('data') ?? '')) : await request.json();
  } catch {
    body = null;
  }
  const parsed = communityHeritageSchema.safeParse(body);
  if (!parsed.success || (editing && !parsed.data.id))
    return NextResponse.json({ message: 'กรุณาตรวจสอบข้อมูลที่กรอก' }, { status: 400 });
  const file = form?.get('file');
  let buffer: Buffer | undefined;
  if (file != null) {
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 2 * 1024 * 1024 ||
      !parsed.data.imageCredit
    )
      return NextResponse.json(
        { message: 'กรุณาระบุเครดิตภาพ และเลือกรูป JPG, PNG หรือ WebP ไม่เกิน 2 MB' },
        { status: 400 }
      );
    buffer = Buffer.from(await file.arrayBuffer());
    const valid =
      (file.type === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) ||
      (file.type === 'image/png' &&
        buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (file.type === 'image/webp' &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP');
    if (!valid) return NextResponse.json({ message: 'ชนิดไฟล์รูปภาพไม่ถูกต้อง' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'เชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  const table = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
  const current = await db.client
    .from(table)
    .select('content,updated_at')
    .eq('section_key', COMMUNITY_EDITS_KEY)
    .maybeSingle();
  if (current.error) return NextResponse.json({ message: 'โหลดข้อมูลไม่สำเร็จ' }, { status: 503 });
  const input = parsed.data;
  const category = COMMUNITY_GROUPS.find((item) => item.key === input.group)!.category;
  const base = [...communityWeaving, ...communityCrafts];
  const items = (current.data?.content?.items ?? []) as Record<string, any>[];
  const existing = editing
    ? (items.find((item) => item.id === input.id) ?? base.find((item) => item.id === input.id))
    : undefined;
  if (
    editing &&
    (!existing ||
      ('deleted' in existing && existing.deleted) ||
      !existing.categories.includes(category))
  )
    return NextResponse.json({ message: 'ไม่พบข้อมูลในหมวดนี้' }, { status: 404 });
  const province = provinces.find((item) => item.name === input.province)!;
  const record: Record<string, any> = {
    ...existing,
    ...input,
    id: existing?.id ?? `community-manual-${crypto.randomUUID()}`,
    region: {
      central: 'ภาคกลาง',
      east: 'ภาคตะวันออก',
      north: 'ภาคเหนือ',
      northeast: 'ภาคตะวันออกเฉียงเหนือ',
      south: 'ภาคใต้',
      west: 'ภาคตะวันตก',
    }[province.region],
    categories: existing?.categories ?? [category, 'งานช่างฝีมือดั้งเดิม'],
    checkedAt: new Date().toISOString().slice(0, 10),
  };
  if (
    [...base, ...items].some(
      (item) =>
        !('deleted' in item && item.deleted) &&
        item.id !== record.id &&
        item.name === record.name &&
        item.province === record.province
    )
  )
    return NextResponse.json({ message: 'มีรายการชื่อนี้ในจังหวัดนี้แล้ว' }, { status: 409 });
  if (input.removeImage) delete record.image;
  if (record.image && input.imageCredit !== undefined) {
    if (!input.imageCredit)
      return NextResponse.json({ message: 'กรุณาระบุเครดิตภาพ' }, { status: 400 });
    record.image = { ...record.image, credit: input.imageCredit };
  }
  if (record.image && input.imageSourceUrl !== undefined) {
    if (input.imageSourceUrl) record.image.sourceUrl = input.imageSourceUrl;
    else delete record.image.sourceUrl;
  }
  let imagePath: string | undefined;
  const storage = db.client.storage?.from(process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets');
  if (file instanceof File && buffer) {
    const extension =
      file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
    imagePath = `cultural-heritage/${record.id}/${crypto.randomUUID()}.${extension}`;
    const uploaded = await storage!.upload(imagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error)
      return NextResponse.json({ message: 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
    record.image = {
      url: storage!.getPublicUrl(imagePath).data.publicUrl,
      credit: input.imageCredit,
      ...(input.imageSourceUrl ? { sourceUrl: input.imageSourceUrl } : {}),
    };
  }
  delete record.removeImage;
  delete record.imageCredit;
  delete record.imageSourceUrl;
  const content = { items: [...items.filter((item) => item.id !== record.id), record] };
  const payload = { content, updated_at: new Date().toISOString() };
  const saved = current.data
    ? await db.client
        .from(table)
        .update(payload)
        .eq('section_key', COMMUNITY_EDITS_KEY)
        .eq('updated_at', current.data.updated_at)
        .select('section_key')
    : await db.client
        .from(table)
        .insert({ section_key: COMMUNITY_EDITS_KEY, ...payload })
        .select('section_key');
  if (saved.error || !saved.data?.length) {
    if (imagePath) await storage!.remove([imagePath]);
    return NextResponse.json(
      { message: 'ข้อมูลเปลี่ยนระหว่างบันทึก กรุณาลองใหม่' },
      { status: 409 }
    );
  }
  return NextResponse.json({ data: record }, { status: editing ? 200 : 201 });
}

export async function POST(request: Request) {
  return saveCommunity(request, false);
}
export async function PATCH(request: Request) {
  return saveCommunity(request, true);
}

export async function DELETE(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
  const auth = await verifyAdminAccessToken(token, ADMIN_PERMISSION.culturalHeritage);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const parsed = communityHeritageSchema
    .pick({ id: true, group: true })
    .extend({ id: z.string().min(1).max(150) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ message: 'ข้อมูลที่ต้องการลบไม่ถูกต้อง' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db.ok) return NextResponse.json({ message: 'เชื่อมต่อฐานข้อมูลไม่ได้' }, { status: 503 });
  const table = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
  const current = await db.client
    .from(table)
    .select('content,updated_at')
    .eq('section_key', COMMUNITY_EDITS_KEY)
    .maybeSingle();
  if (current.error) return NextResponse.json({ message: 'โหลดข้อมูลไม่สำเร็จ' }, { status: 503 });
  const items = (current.data?.content?.items ?? []) as Record<string, any>[];
  const existing =
    items.find((item) => item.id === parsed.data.id) ??
    [...communityWeaving, ...communityCrafts].find((item) => item.id === parsed.data.id);
  const category = COMMUNITY_GROUPS.find((item) => item.key === parsed.data.group)!.category;
  if (
    !existing ||
    ('deleted' in existing && existing.deleted) ||
    !existing.categories.includes(category)
  )
    return NextResponse.json({ message: 'ไม่พบข้อมูลในหมวดนี้' }, { status: 404 });
  const payload = {
    content: {
      items: [
        ...items.filter((item) => item.id !== existing.id),
        { ...existing, deleted: true, group: parsed.data.group },
      ],
    },
    updated_at: new Date().toISOString(),
  };
  const saved = current.data
    ? await db.client
        .from(table)
        .update(payload)
        .eq('section_key', COMMUNITY_EDITS_KEY)
        .eq('updated_at', current.data.updated_at)
        .select('section_key')
    : await db.client
        .from(table)
        .insert({ section_key: COMMUNITY_EDITS_KEY, ...payload })
        .select('section_key');
  if (saved.error || !saved.data?.length)
    return NextResponse.json(
      { message: 'ข้อมูลเปลี่ยนระหว่างบันทึก กรุณาลองใหม่' },
      { status: 409 }
    );
  return NextResponse.json({ success: true });
}
