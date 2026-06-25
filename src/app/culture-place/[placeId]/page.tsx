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
import { getCultureCategoryLabel } from 'src/lib/culture-categories';

import { cleanCulturalText, cleanCulturalUrl } from 'src/sections/province/view/province-detail-utils';

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
  detail?: string | null;
};

type SharePlace = CulturalPlace & {
  provinceCode: string;
  provinceName: string;
};

function getAbsoluteUrl(value?: string | null) {
  const url = cleanCulturalUrl(value);

  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return new URL(url, SITE_URL).toString();
}

function getProvinceName(provinceCode: string) {
  return provinces.find((province) => province.code === provinceCode)?.name ?? provinceCode;
}

function getCategoryLabel(category?: string | null) {
  return category ? getCultureCategoryLabel(category) : 'วัฒนธรรมไทย';
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
  const name = cleanCulturalText(row.name);

  if (!row.id || !name || row.lat == null || row.lng == null) {
    return null;
  }

  const payload = row.payload ?? {};
  const imageUrls = [
    ...(row.image_urls ?? []),
    ...((Array.isArray(payload.imageUrls) ? payload.imageUrls : []) as string[]),
  ]
    .map(cleanCulturalUrl)
    .filter(Boolean);

  return {
    ...payload,
    id: row.id,
    provinceCode: row.province_code,
    provinceName: getProvinceName(row.province_code),
    name,
    district: cleanCulturalText(row.district),
    category: cleanCulturalText(row.category) || 'cultural_attraction',
    lat: row.lat,
    lng: row.lng,
    description: cleanCulturalText(row.description),
    highlight: cleanCulturalText(row.highlight),
    imageUrls,
    sourceUrl: cleanCulturalUrl(row.source_url ?? payload.sourceUrl),
    mapUrl: cleanCulturalUrl(row.map_url ?? payload.mapUrl),
    source: (cleanCulturalText(row.source) as CulturalPlace['source']) || payload.source || 'local',
  };
}

function applyOverride(place: SharePlace, override?: PlaceOverride | null): SharePlace {
  if (!override) {
    return place;
  }

  return {
    ...place,
    provinceCode: cleanCulturalText(override.province_code) || place.provinceCode,
    provinceName: getProvinceName(cleanCulturalText(override.province_code) || place.provinceCode),
    name: cleanCulturalText(override.name) || place.name,
    source: (cleanCulturalText(override.source) as CulturalPlace['source']) || place.source,
    category: cleanCulturalText(override.category) || place.category,
    district: cleanCulturalText(override.district) || place.district,
    lat: override.lat ?? place.lat,
    lng: override.lng ?? place.lng,
    mapUrl: cleanCulturalUrl(override.map_url) || place.mapUrl,
    imageUrls: cleanCulturalUrl(override.image_url) ? [cleanCulturalUrl(override.image_url)] : place.imageUrls,
    highlight: cleanCulturalText(override.note) || place.highlight,
    description: cleanCulturalText(override.detail) || place.description,
  };
}

function createSharePlaceFromOverride(override: PlaceOverride): SharePlace | null {
  if (!override.place_id || override.lat == null || override.lng == null) {
    return null;
  }

  const provinceCode = cleanCulturalText(override.province_code);
  const category = cleanCulturalText(override.category) || 'cultural_attraction';
  const note = cleanCulturalText(override.note);
  const detail = cleanCulturalText(override.detail);
  const imageUrl = cleanCulturalUrl(override.image_url);

  return {
    id: override.place_id,
    provinceCode,
    provinceName: getProvinceName(provinceCode),
    name: cleanCulturalText(override.name) || 'สถานที่ใหม่',
    source: (cleanCulturalText(override.source) as CulturalPlace['source']) || 'thailand_cultural_hub',
    category,
    district: cleanCulturalText(override.district),
    lat: override.lat,
    lng: override.lng,
    description: detail || note,
    highlight: note || category,
    mapUrl: cleanCulturalUrl(override.map_url) || undefined,
    imageUrls: imageUrl ? [imageUrl] : [],
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
        'place_id, province_code, name, source, category, district, lat, lng, map_url, image_url, note, detail'
      )
      .eq('place_id', placeId)
      .maybeSingle(),
  ]);

  if (placeResult.error && !overrideResult.data) {
    return null;
  }

  const override = overrideResult.data as PlaceOverride | null;
  const place = placeResult.data ? mapPlaceRow(placeResult.data as CulturalPlaceRow) : null;

  if (place) {
    return applyOverride(place, override);
  }

  return override ? createSharePlaceFromOverride(override) : null;
}

function getSeoDescription(place: SharePlace) {
  const parts = [
    cleanCulturalText(place.highlight),
    cleanCulturalText(place.description),
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
  const descriptionText =
    cleanCulturalText(place.description) ||
    cleanCulturalText(place.highlight) ||
    'ยังไม่มีรายละเอียดเพิ่มเติมสำหรับสถานที่นี้';

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
            {descriptionText}
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
