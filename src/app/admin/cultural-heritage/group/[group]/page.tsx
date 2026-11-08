import { notFound } from 'next/navigation';

import { COMMUNITY_GROUPS } from 'src/lib/cultural-data-groups';

import { CulturalHeritageClient } from '../../cultural-heritage-client';

export default async function Page({ params }: { params: Promise<{ group: string }> }) {
  const { group: key } = await params;
  const group = COMMUNITY_GROUPS.find((item) => item.key === key);
  if (!group) notFound();
  return (
    <CulturalHeritageClient
      key={key}
      initialCollection="community"
      initialCategory={group.category}
    />
  );
}
