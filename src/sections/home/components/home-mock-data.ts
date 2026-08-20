import type { PerformanceGroupsContent } from './home-types';

/** Empty fallback when the performance-groups data source is unavailable. */
export const MOCK_PERFORMANCE_GROUPS: PerformanceGroupsContent = {
  title: 'วงศิลปินและวงดนตรี',
  description: 'ข้อมูลวงโปงลาง วงหมอลำ และวงดนตรี',
  groups: [],
};

export function mergeWithMockPerformanceGroups(content?: PerformanceGroupsContent) {
  return {
    title: content?.title || MOCK_PERFORMANCE_GROUPS.title,
    description: content?.description || MOCK_PERFORMANCE_GROUPS.description,
    groups: content?.groups ?? [],
  } satisfies PerformanceGroupsContent;
}
