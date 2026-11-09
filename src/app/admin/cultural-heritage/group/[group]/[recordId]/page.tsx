import { notFound } from 'next/navigation';

import { COMMUNITY_GROUPS } from 'src/lib/cultural-data-groups';
import { getCulturalHeritage } from 'src/server/cultural-heritage';

import { CommunityHeritageForm } from '../../../community-heritage-form';

export const metadata = { title: 'แก้ไขข้อมูลหัตถกรรมชุมชน | Admin' };

export default async function Page({
  params,
}: {
  params: Promise<{ group: string; recordId: string }>;
}) {
  const { group, recordId } = await params;
  const config = COMMUNITY_GROUPS.find((item) => item.key === group);
  if (!config) notFound();
  const result = await getCulturalHeritage({
    collection: 'community',
    category: config.category,
    recordId,
    limit: 1,
  });
  const record = result.data[0];
  if (!record) notFound();
  return <CommunityHeritageForm key={record.id} group={config.key} record={record} />;
}
