import type { SupabaseClient } from '@supabase/supabase-js';

import { homeHeroSchema, HOME_HERO_SECTION_KEY } from 'src/lib/home-hero';
import {
  applyHomeHeroOperation,
  HomeHeroOperationError,
  type HomeHeroOperation,
} from 'src/lib/home-hero-crud';

const table = () => process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
async function readRow(db: SupabaseClient) {
  const { data, error } = await db
    .from(table())
    .select('section_key,content,updated_at')
    .eq('section_key', HOME_HERO_SECTION_KEY)
    .abortSignal(AbortSignal.timeout(5000))
    .maybeSingle();
  if (error) throw new Error('อ่านข้อมูลภาพไม่ได้');
  return data;
}
function savedImages(row: { content: unknown } | null) {
  if (!row) return [];
  const parsed = homeHeroSchema.safeParse(row.content);
  if (!parsed.success) throw new Error('ข้อมูลภาพที่บันทึกไว้ไม่ถูกต้อง กรุณาตรวจสอบข้อมูล');
  return parsed.data.images;
}
export async function readHomeHeroRecords(db: SupabaseClient) {
  return savedImages(await readRow(db));
}
export async function mutateHomeHeroRecord(db: SupabaseClient, operation: HomeHeroOperation) {
  // Compare-and-swap the section revision; retry against the newest list when another record changed.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await readRow(db);
    const images = applyHomeHeroOperation(savedImages(row), operation);
    if (!row) {
      const { error } = await db
        .from(table())
        .insert({
          section_key: HOME_HERO_SECTION_KEY,
          content: { images },
          updated_at: new Date().toISOString(),
        });
      if (error?.code === '23505') continue;
      if (error) throw new Error('บันทึกภาพไม่สำเร็จ');
      return images;
    }
    const updatedAt = new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString();
    const { data, error } = await db
      .from(table())
      .update({ content: { images }, updated_at: updatedAt })
      .eq('section_key', HOME_HERO_SECTION_KEY)
      .eq('updated_at', row.updated_at)
      .select('section_key')
      .maybeSingle();
    if (error) throw new Error('บันทึกภาพไม่สำเร็จ');
    if (data) return images;
  }
  throw new HomeHeroOperationError('มีการแก้ไขพร้อมกัน กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง', 409);
}
