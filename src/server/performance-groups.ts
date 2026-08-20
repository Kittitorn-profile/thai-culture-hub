import type { PerformanceGroupsContent } from 'src/sections/home/components/home-types';

import { cache } from 'react';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

import { normalizePerformanceGroupsContent } from 'src/sections/home/components/home-utils';
import { PERFORMANCE_GROUPS_SECTION_KEY } from 'src/sections/home/components/home-constants';
import {
  MOCK_PERFORMANCE_GROUPS,
  mergeWithMockPerformanceGroups,
} from 'src/sections/home/components/home-mock-data';

const TABLE_NAME = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';

type PerformanceGroupsRow = {
  content: PerformanceGroupsContent | null;
  updated_at: string | null;
};

export const getPublishedPerformanceGroups = cache(async () => {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { groups: MOCK_PERFORMANCE_GROUPS.groups, updatedAt: null as string | null };
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('content, updated_at')
    .eq('section_key', PERFORMANCE_GROUPS_SECTION_KEY)
    .maybeSingle();

  if (error || !data) {
    return { groups: MOCK_PERFORMANCE_GROUPS.groups, updatedAt: null as string | null };
  }

  const row = data as PerformanceGroupsRow;
  const normalized = normalizePerformanceGroupsContent(row.content ?? undefined);
  const merged = mergeWithMockPerformanceGroups(normalized);

  return {
    groups: merged.groups.filter((group) => group.isPublished !== false),
    updatedAt: row.updated_at,
  };
});

export async function getPublishedPerformanceGroup(groupId: string) {
  const { groups } = await getPublishedPerformanceGroups();

  return groups.find((group) => (group.id || group.name) === groupId);
}
