import { publicPageMetadata } from 'src/lib/page-metadata';
import { getPublishedPerformanceGroups } from 'src/server/performance-groups';

import { MOCK_PERFORMANCE_GROUPS } from 'src/sections/home/components/home-mock-data';
import { HomePerformanceGroupsSection } from 'src/sections/home/components/home-performance-groups-section';

export const metadata = publicPageMetadata(
  'วงศิลปินและวงดนตรีทั้งหมด',
  'รู้จักวงโปงลาง วงหมอลำ และวงดนตรีไทย เลือกตามหมวดหมู่ พร้อมประวัติ ผลงาน และช่องทางติดตาม',
  '/performance-groups/'
);

export default async function Page() {
  const { groups } = await getPublishedPerformanceGroups();

  return <HomePerformanceGroupsSection content={{ ...MOCK_PERFORMANCE_GROUPS, groups }} showAll />;
}
