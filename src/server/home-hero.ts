import { homeHeroSchema } from 'src/lib/home-hero';

import { getSupabaseAdmin } from './supabase-admin';

/** Read the published images before rendering so hydration never swaps in a default banner. */
export async function getPublishedHomeHeroImages() {
  const db = getSupabaseAdmin();
  if (!db.ok) return [];
  try {
    const { data, error } = await db.client
      .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
      .select('content')
      .eq('section_key', 'hero-images')
      .abortSignal(AbortSignal.timeout(5000))
      .maybeSingle();
    if (error) throw error;
    const parsed = homeHeroSchema.safeParse(data?.content);
    return parsed.success ? parsed.data.images.filter((image) => image.isActive) : [];
  } catch {
    console.warn('Unable to load published home hero images');
    return [];
  }
}
