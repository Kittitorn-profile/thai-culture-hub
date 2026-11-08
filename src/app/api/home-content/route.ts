import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { getCultureCategoryKeyByTitle } from 'src/lib/culture-categories';

const TABLE_NAME = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';

type HomeContentRow = {
  section_key: string;
  content: unknown;
  updated_at?: string | null;
};

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: {}, message: supabase.error }, { status: 200 });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('section_key, content, updated_at')
    .neq('section_key', 'ethnic-community-supplements-v1')
    .neq('section_key', 'province-artists-v1');

  if (error) {
    return NextResponse.json({ data: {}, message: error.message }, { status: 200 });
  }

  const sections = Object.fromEntries(
    ((data ?? []) as HomeContentRow[]).map((row) => [row.section_key, row.content])
  );

  const categories = sections['culture-categories'] as
    | { items?: Array<{ title?: string; imageUrl?: string }> }
    | undefined;

  if (Array.isArray(categories?.items)) {
    const configTable = process.env.CULTURAL_CATEGORIES_TABLE ?? 'cultural_categories';
    const placesTable = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
    const { data: configs } = await supabase.client
      .from(configTable)
      .select('key, image_url')
      .eq('is_active', true);
    const configuredImages = new Map<string, string>(
      (configs ?? []).filter((item) => item.image_url).map((item) => [item.key, item.image_url])
    );

    categories.items = await Promise.all(
      categories.items.map(async (item) => {
        const imageUrl = item.imageUrl?.trim();
        const isPlaceholder =
          !imageUrl ||
          /^\/assets\/(background\/akhahas-sri-|akhahas-sri\/hero-1\.jpg)/.test(imageUrl);
        if (!isPlaceholder || !item.title) return item;

        const categoryKey = getCultureCategoryKeyByTitle(item.title.trim());
        const configuredImage = configuredImages.get(categoryKey);
        if (configuredImage) return { ...item, imageUrl: configuredImage };

        const { data: places } = await supabase.client
          .from(placesTable)
          .select('image_urls')
          .eq('category', categoryKey)
          .not('image_urls', 'is', null)
          .order('id')
          .limit(30);
        const categoryImage = (places ?? [])
          .flatMap((place) => place.image_urls ?? [])
          .find(
            (url: unknown): url is string => typeof url === 'string' && /^https?:\/\//.test(url)
          );

        return categoryImage ? { ...item, imageUrl: categoryImage } : item;
      })
    );
  }

  return NextResponse.json({ data: sections });
}
