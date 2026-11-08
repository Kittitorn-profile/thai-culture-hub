import { notFound } from 'next/navigation';

import { ARTIST_GROUPS } from 'src/lib/cultural-data-groups';

import { CulturalArtistsClient } from '../../cultural-artists-client';

export default async function Page({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!ARTIST_GROUPS.some((group) => group.key === type)) notFound();
  return <CulturalArtistsClient key={type} initialType={type} />;
}
