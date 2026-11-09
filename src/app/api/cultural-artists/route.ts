import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { isDatasetVisible } from 'src/server/dataset-visibility';
import {
  ARTIST_TYPES,
  filterCulturalArtists,
  getCulturalArtistDirectory,
} from 'src/server/cultural-artists';

const filtersSchema = z.object({
  provinceCode: z
    .string()
    .refine((code) => provinces.some((province) => province.code === code), 'จังหวัดไม่ถูกต้อง')
    .optional(),
  type: z.enum(ARTIST_TYPES).optional(),
  provinceStatus: z.enum(['verified', 'pending_verification']).optional(),
  genre: z.string().max(100).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const parsed = filtersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });
  try {
    if (!(await isDatasetVisible('artists')))
      return NextResponse.json(
        {
          data: [],
          total: 0,
          pagination: { page: parsed.data.page, pageSize: parsed.data.pageSize, totalPages: 0 },
          coverage: {
            totalArtists: 0,
            withVerifiedProvince: 0,
            provinces: 0,
            provinceCounts: {},
            nationalRegistryYears: [],
          },
          genres: [],
          notes: [],
          sources: [],
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    const directory = await getCulturalArtistDirectory();
    const artists = filterCulturalArtists(directory.artists, parsed.data);
    const provinceCounts: Record<string, number> = {};
    directory.artists.forEach((artist) =>
      new Set(artist.provinceAssociations.map((province) => province.provinceCode)).forEach(
        (code) => {
          provinceCounts[code] = (provinceCounts[code] ?? 0) + 1;
        }
      )
    );
    const { page, pageSize } = parsed.data;
    return NextResponse.json(
      {
        data: artists.slice((page - 1) * pageSize, page * pageSize),
        total: artists.length,
        pagination: { page, pageSize, totalPages: Math.ceil(artists.length / pageSize) },
        coverage: {
          totalArtists: directory.artists.length,
          withVerifiedProvince: directory.artists.filter(
            (artist) => artist.provinceAssociations.length
          ).length,
          provinces: Object.keys(provinceCounts).length,
          provinceCounts,
          nationalRegistryYears: directory.nationalRegistryCoverage,
        },
        genres: [...new Set(directory.artists.flatMap((artist) => artist.genres))].sort((a, b) =>
          a.localeCompare(b, 'th')
        ),
        checkedAt: directory.checkedAt,
        notes: directory.notes,
        sources: directory.sources,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'ยังโหลดข้อมูลศิลปินไม่ได้ กรุณาลองอีกครั้ง' },
      { status: 503 }
    );
  }
}
