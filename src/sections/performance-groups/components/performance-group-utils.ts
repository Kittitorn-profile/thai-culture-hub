import type { PerformanceGroupEntry, PerformanceGroupsContent } from 'src/sections/home/components/home-types';

export function findGroup(content: PerformanceGroupsContent | undefined, groupId: string) {
  return content?.groups.find((group) => (group.id || group.name) === groupId);
}

export function getRandomRelatedGroups(
  groups: PerformanceGroupEntry[],
  currentGroup: PerformanceGroupEntry,
  limit = 3
) {
  const currentGroupId = currentGroup.id || currentGroup.name;
  const currentCategory = currentGroup.category?.trim();
  const candidates = groups.filter(
    (item) =>
      item.isPublished !== false &&
      (item.id || item.name) !== currentGroupId &&
      Boolean(currentCategory) &&
      item.category?.trim() === currentCategory
  );

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
  }

  return candidates.slice(0, limit);
}

export function formatUpdatedDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
