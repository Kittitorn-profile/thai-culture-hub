import { notFound } from 'next/navigation';

import { getCulturalArtistDirectory } from 'src/server/cultural-artists';

import { ArtistCreateClient } from '../new/artist-create-client';

export const metadata = { title: 'รายละเอียดศิลปิน | Admin' };

export default async function Page({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params;
  const directory = await getCulturalArtistDirectory();
  const artist = directory.artists.find((item) => item.id === artistId);
  if (!artist) notFound();
  return <ArtistCreateClient key={artist.id} artist={artist} />;
}
