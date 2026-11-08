import type { Metadata } from 'next';

import { culturalInitialFilters } from 'src/utils/cultural-explore';

import { CulturalHeritageClient } from './cultural-heritage-client';

export const metadata: Metadata = { title: 'มรดกภูมิปัญญาทางวัฒนธรรม | Admin' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = culturalInitialFilters(params, 'heritage');
  const collection = params.collection === 'community' ? 'community' : 'registry';
  const category = typeof params.category === 'string' ? params.category.slice(0, 100) : '';
  return (
    <CulturalHeritageClient
      key={JSON.stringify({ ...filters, collection, category })}
      initialCollection={collection}
      initialCategory={category}
      initialQuery={filters.query}
      initialProvince={filters.province}
    />
  );
}
