import { notFound } from 'next/navigation';

import { COMMUNITY_GROUPS } from 'src/lib/cultural-data-groups';

import { CommunityHeritageForm } from '../../../community-heritage-form';

export const metadata = { title: 'เพิ่มข้อมูลหัตถกรรมชุมชน | Admin' };

export default async function Page({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const config = COMMUNITY_GROUPS.find((item) => item.key === group);
  if (!config) notFound();
  return <CommunityHeritageForm group={config.key} />;
}
