import { z } from 'zod';
import { cache } from 'react';

import { getSupabaseAdmin } from './supabase-admin';

export const ARTIST_DIRECTORY_SECTION_KEY = 'province-artists-v1';
export const ARTIST_TYPES = [
  'national_artist',
  'contemporary_artist',
  'silpathorn_artist',
  'folk_artist',
  'local_artist',
  'performing_artist',
] as const;
const artistSchema = z.object({
  image: z
    .object({
      url: z.string().url(),
      credit: z.string().min(1),
      sourceUrl: z.string().url().optional(),
    })
    .optional(),
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  types: z.array(z.enum(ARTIST_TYPES)),
  fields: z.array(z.string()),
  genres: z.array(z.string()),
  provinceStatus: z.enum(['verified', 'pending_verification']),
  provinceAssociations: z.array(
    z.object({
      provinceCode: z.string().regex(/^TH-\d{2}$/),
      provinceName: z.string(),
      relationship: z.enum([
        'birthplace',
        'origin',
        'work_area',
        'learning_site',
        'cultural_legacy',
      ]),
      sourceUrl: z.string().url(),
      district: z.string().optional(),
      sourceProvinceName: z.string().optional(),
    })
  ),
  awards: z
    .array(z.object({ title: z.string(), yearBE: z.number().int(), sourceUrl: z.string().url() }))
    .optional(),
  recognitions: z.array(
    z.object({
      type: z.enum(ARTIST_TYPES),
      yearBE: z.number().int(),
      field: z.string(),
      specialty: z.string(),
      sourceUrl: z.string().url(),
      status: z.literal('historical_registry'),
    })
  ),
  sources: z.array(
    z.object({ datasetKey: z.string(), recordIndex: z.number().optional(), url: z.string().url() })
  ),
});
const directorySchema = z.object({
  schemaVersion: z.literal(1),
  checkedAt: z.string(),
  nationalRegistryCoverage: z.object({ fromBE: z.number(), toBE: z.number() }),
  notes: z.array(z.string()),
  sources: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      organization: z.string(),
      url: z.string().url(),
      downloadUrl: z.string().url(),
      license: z.string().nullable(),
      sourceModifiedAt: z.string().nullable().optional(),
    })
  ),
  rawCounts: z.record(z.string(), z.number()),
  artists: z.array(artistSchema),
});
export type CulturalArtist = z.infer<typeof artistSchema>;
export type ArtistDirectory = z.infer<typeof directorySchema>;

export const getCulturalArtistDirectory = cache(async (): Promise<ArtistDirectory> => {
  const db = getSupabaseAdmin();
  if (!db.ok) throw new Error('Artist directory database is unavailable');
  const { data, error } = await db.client
    .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
    .select('content')
    .eq('section_key', ARTIST_DIRECTORY_SECTION_KEY)
    .abortSignal(AbortSignal.timeout(15000))
    .maybeSingle();
  if (error || !data) throw new Error('Artist directory is not available');
  return directorySchema.parse(data.content);
});

export function filterCulturalArtists(
  artists: CulturalArtist[],
  filters: {
    provinceCode?: string;
    type?: string;
    genre?: string;
    q?: string;
    provinceStatus?: string;
  }
) {
  const query = filters.q?.trim().toLocaleLowerCase('th');
  return artists
    .filter(
      (artist) =>
        (!filters.provinceCode ||
          artist.provinceAssociations.some(
            (province) => province.provinceCode === filters.provinceCode
          )) &&
        (!filters.provinceStatus || artist.provinceStatus === filters.provinceStatus) &&
        (!filters.type || artist.types.some((type) => type === filters.type)) &&
        (!filters.genre || artist.genres.includes(filters.genre)) &&
        (!query ||
          [artist.name, ...artist.aliases, ...artist.fields, ...artist.genres]
            .join(' ')
            .toLocaleLowerCase('th')
            .includes(query))
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'th') || a.id.localeCompare(b.id));
}
