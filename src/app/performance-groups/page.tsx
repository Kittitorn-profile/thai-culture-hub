import { getPublishedPerformanceGroups } from 'src/server/performance-groups';

import { MOCK_PERFORMANCE_GROUPS } from 'src/sections/home/components/home-mock-data';
import { HomePerformanceGroupsSection } from 'src/sections/home/components/home-performance-groups-section';

export const metadata = { title: 'วงศิลปินและวงดนตรีทั้งหมด | Thailand Cultural Hub' };

export default async function Page() {
  const { groups } = await getPublishedPerformanceGroups();

  return <HomePerformanceGroupsSection content={{ ...MOCK_PERFORMANCE_GROUPS, groups }} showAll />;
}
