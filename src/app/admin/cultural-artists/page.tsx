import { culturalInitialFilters } from 'src/utils/cultural-explore';

import { CulturalArtistsClient } from './cultural-artists-client';

export const metadata = { title: 'ศิลปินรายจังหวัด | Admin' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = culturalInitialFilters(await searchParams, 'artists');
  return (
    <CulturalArtistsClient
      key={JSON.stringify(filters)}
      initialQuery={filters.query}
      initialProvince={filters.province}
    />
  );
}
