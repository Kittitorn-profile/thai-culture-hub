import type { Metadata } from 'next';
import type { CulturalPlace } from 'src/sections/province/province-data';

import { notFound } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

// ----------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';
const OG_FALLBACK_IMAGE =
  'https://res.cloudinary.com/dkdbilwtj/image/upload/v1782029454/og-images_vvdlcu.jpg';

type PageProps = {
  params: Promise<{
    placeId: string;
  }>;
};

type CulturalPlaceRow = {
  id: string;
  province_code: string;
  name: string | null;
  district: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  highlight: string | null;
  image_urls: string[] | null;
  source_url: string | null;
  map_url: string | null;
  source: string | null;
  payload?: Partial<CulturalPlace> | null;
};

type PlaceOverride = {
  place_id: string;
  province_code?: string | null;
  name?: string | null;
  source?: string | null;
  category?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  map_url?: string | null;
  image_url?: string | null;
  note?: string | null;
};

type SharePlace = CulturalPlace & {
  provinceCode: string;
  provinceName: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  community_wisdom: 'ภูมิปัญญาชุมชน',
  craftsmanship: 'งานช่างฝีมือ',
  cultural_attraction: 'แหล่งท่องเที่ยวทางวัฒนธรรม',
  folk_art: 'ศิลปะพื้นบ้าน',
  learning_center: 'แหล่งเรียนรู้',
  local_food: 'อาหารพื้นบ้าน',
  local_tradition: 'ประเพณีท้องถิ่น',
  moral_community: 'ชุมชนคุณธรรม',
  museum: 'พิพิธภัณฑ์',
  performing_art: 'ศิลปะการแสดง',
  ritual: 'พิธีกรรม',
  temple: 'ศาสนสถาน',
  tourist_attraction: 'สถานที่ท่องเที่ยว',
};

function getAbsoluteUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return new URL(value, SITE_URL).toString();
}

function getProvinceName(provinceCode: string) {
  return provinces.find((province) => province.code === provinceCode)?.name ?? provinceCode;
}

function getCategoryLabel(category?: string | null) {
  return category ? (CATEGORY_LABELS[category] ?? category) : 'วัฒนธรรมไทย';
}

function getShareUrl(placeId: string) {
  return `${SITE_URL}/culture-place/${encodeURIComponent(placeId)}`;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function mapPlaceRow(row: CulturalPlaceRow): SharePlace | null {
  if (!row.id || !row.name || row.lat == null || row.lng == null) {
    return null;
  }

  return {
    ...(row.payload ?? {}),
    id: row.id,
    provinceCode: row.province_code,
    provinceName: getProvinceName(row.province_code),
    name: row.name,
    district: row.district ?? '',
    category: row.category ?? 'cultural_attraction',
    lat: row.lat,
    lng: row.lng,
    description: row.description ?? '',
    highlight: row.highlight ?? '',
    imageUrls: row.image_urls ?? row.payload?.imageUrls ?? [],
    sourceUrl: row.source_url ?? row.payload?.sourceUrl,
    mapUrl: row.map_url ?? row.payload?.mapUrl,
    source: (row.source as CulturalPlace['source']) ?? row.payload?.source ?? 'local',
  };
}

function applyOverride(place: SharePlace, override?: PlaceOverride | null): SharePlace {
  if (!override) {
    return place;
  }

  return {
    ...place,
    provinceCode: override.province_code || place.provinceCode,
    provinceName: getProvinceName(override.province_code || place.provinceCode),
    name: override.name || place.name,
    source: (override.source as CulturalPlace['source']) || place.source,
    category: override.category || place.category,
    district: override.district || place.district,
    lat: override.lat ?? place.lat,
    lng: override.lng ?? place.lng,
    mapUrl: override.map_url || place.mapUrl,
    imageUrls: override.image_url ? [override.image_url] : place.imageUrls,
    highlight: override.note || place.highlight,
  };
}

async function getSharePlace(placeId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return null;
  }

  const [placeResult, overrideResult] = await Promise.all([
    supabase.client
      .from(process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places')
      .select(
        'id, province_code, name, district, category, lat, lng, description, highlight, image_urls, source_url, map_url, source, payload'
      )
      .eq('id', placeId)
      .maybeSingle(),
    supabase.client
      .from(process.env.CULTURAL_PLACE_OVERRIDES_TABLE ?? 'cultural_place_overrides')
      .select(
        'place_id, province_code, name, source, category, district, lat, lng, map_url, image_url, note'
      )
      .eq('place_id', placeId)
      .maybeSingle(),
  ]);

  if (placeResult.error || !placeResult.data) {
    return null;
  }

  const place = mapPlaceRow(placeResult.data as CulturalPlaceRow);

  return place ? applyOverride(place, overrideResult.data as PlaceOverride | null) : null;
}

function getSeoDescription(place: SharePlace) {
  const parts = [
    place.highlight,
    place.description,
    [place.district, place.provinceName].filter(Boolean).join(' '),
  ].filter(Boolean);

  return parts.join(' - ').slice(0, 220);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { placeId } = await params;
  const place = await getSharePlace(safeDecode(placeId));

  if (!place) {
    return {
      title: 'Thailand Cultural Hub',
      description: 'สำรวจข้อมูลวัฒนธรรมไทยจากทุกจังหวัด',
    };
  }

  const title = `${place.name} | ${getCategoryLabel(place.category)} | Thailand Cultural Hub`;
  const description = getSeoDescription(place);
  const imageUrl = getAbsoluteUrl(place.imageUrls?.[0]) ?? OG_FALLBACK_IMAGE;
  const url = getShareUrl(place.id);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Thailand Cultural Hub',
      locale: 'th_TH',
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: place.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { placeId } = await params;
  const place = await getSharePlace(safeDecode(placeId));

  if (!place) {
    notFound();
  }

  const imageUrl = getAbsoluteUrl(place.imageUrls?.[0]) ?? OG_FALLBACK_IMAGE;
  const mapUrl =
    place.mapUrl || `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        px: { xs: 2.5, md: 6 },
        py: { xs: 8, md: 12 },
        bgcolor: '#7b8476',
        backgroundImage: `
          radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
          linear-gradient(180deg, #6f8790 0%, #7b8476 54%, #8f7c5c 100%)
        `,
      }}
    >
      <Card sx={{ mx: 'auto', maxWidth: 920, overflow: 'hidden', borderRadius: 1 }}>
        <Box
          component="img"
          src={imageUrl}
          alt={place.name}
          sx={{ width: 1, height: { xs: 260, md: 420 }, objectFit: 'cover', display: 'block' }}
        />
        <Stack spacing={2.2} sx={{ p: { xs: 3, md: 4 } }}>
          <Typography sx={{ color: '#8f7c5c', fontSize: 14, fontWeight: 900 }}>
            {getCategoryLabel(place.category)} / {place.provinceName}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 950 }}>
            {place.name}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 16, lineHeight: 1.8 }}>
            {place.description || place.highlight}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, fontWeight: 800 }}>
            {place.district ? `${place.district} / ` : ''}
            {place.provinceName}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
            <Button variant="contained" href={`/province/${place.provinceCode}`}>
              ดูจังหวัดนี้
            </Button>
            <Button variant="outlined" href={mapUrl} target="_blank" rel="noopener noreferrer">
              เปิด Google Map
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}
