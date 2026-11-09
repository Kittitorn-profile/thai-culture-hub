import { COMMUNITY_EDITS_KEY } from 'src/lib/community-heritage-form';

import { getSupabaseAdmin } from './supabase-admin';

export async function getCommunityHeritageEdits(): Promise<Record<string, any>[]> {
  const db = getSupabaseAdmin();
  if (!db.ok) return [];
  const { data, error } = await db.client
    .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
    .select('content')
    .eq('section_key', COMMUNITY_EDITS_KEY)
    .maybeSingle();
  if (error) throw new Error('โหลดข้อมูลชุมชนที่แก้ไขไม่สำเร็จ');
  return data?.content?.items ?? [];
}
