import { notFound, permanentRedirect } from 'next/navigation';

import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';

type Props = {
  params: Promise<{ group: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Preserve links to the original directory routes.
export default async function Page({ params, searchParams }: Props) {
  const { group } = await params;
  const definition = PUBLIC_DATA_GROUPS.find((item) => item.key === group && item.key !== 'places');
  if (!definition) notFound();
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
    else if (value !== undefined) search.set(key, value);
  }
  permanentRedirect(`${definition.href}${search.size ? `?${search}` : ''}`);
}
