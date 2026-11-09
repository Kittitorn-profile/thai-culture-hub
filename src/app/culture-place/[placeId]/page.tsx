import type { Metadata } from 'next';
import type { CulturalPlace } from 'src/sections/province/province-data';

import { cache } from 'react';
import { notFound } from 'next/navigation';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { isPublicPlaceVisible } from 'src/lib/dataset-visibility';
import { getCultureCategoryLabel } from 'src/lib/culture-categories';
import { getDatasetVisibility, requireDatasetVisible } from 'src/server/dataset-visibility';

import { CulturePlaceDetailView } from 'src/sections/province/view/culture-place-detail-view';
import {
  cleanCulturalUrl,
  cleanCulturalText,
} from 'src/sections/province/view/province-detail-utils';

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
    imageUrls: cleanCulturalUrl(override.image_url)
      ? [cleanCulturalUrl(override.image_url)]
      : place.imageUrls,
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
    source:
      (cleanCulturalText(override.source) as CulturalPlace['source']) || 'thailand_cultural_hub',
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

const getSharePlace = cache(async (placeId: string) => {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return null;
  }

  const [placeResult, overrideResult, detailsResult] = await Promise.all([
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
    supabase.client
      .from(process.env.CULTURAL_PLACE_DETAILS_TABLE ?? 'cultural_place_details')
      .select(
        'place_id, detail_th, address, address_road, subdistrict_name_th, postcode, tel, email, opening_hours, fee_th, website, facebook'
      )
      .eq('place_id', placeId)
      .maybeSingle(),
  ]);

  if (placeResult.error && !overrideResult.data) {
    return null;
  }

  const override = overrideResult.data as PlaceOverride | null;
  const place = placeResult.data ? mapPlaceRow(placeResult.data as CulturalPlaceRow) : null;

  const resolved = place
    ? applyOverride(place, override)
    : override
      ? createSharePlaceFromOverride(override)
      : null;
  if (!resolved) return null;
  const detail = detailsResult.data as Record<string, string | null> | null;
  if (!detail) return resolved;
  return {
    ...resolved,
    description:
      cleanCulturalText(override?.detail) ||
      cleanCulturalText(detail.detail_th) ||
      resolved.description,
    details: {
      ...resolved.details,
      placeId,
      provinceCode: resolved.provinceCode,
      address: cleanCulturalText(detail.address),
      addressRoad: cleanCulturalText(detail.address_road),
      subdistrictNameTh: cleanCulturalText(detail.subdistrict_name_th),
      postcode: cleanCulturalText(detail.postcode),
      tel: cleanCulturalText(detail.tel),
      email: cleanCulturalText(detail.email),
      openingHours: cleanCulturalText(detail.opening_hours),
      feeTh: cleanCulturalText(detail.fee_th),
      website: cleanCulturalUrl(detail.website),
      facebook: cleanCulturalUrl(detail.facebook),
    },
  };
});

function getSeoDescription(place: SharePlace) {
  const parts = [
    cleanCulturalText(place.highlight),
    cleanCulturalText(place.description),
    [place.district, place.provinceName].filter(Boolean).join(' '),
  ].filter(Boolean);

  return parts.join(' - ').slice(0, 220);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await requireDatasetVisible('places');
  const { placeId } = await params;
  const place = await getSharePlace(safeDecode(placeId));

  if (!place || !isPublicPlaceVisible(place.source, (await getDatasetVisibility()).hidden)) {
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

export const dynamic = 'force-dynamic';

export default async function Page({ params }: PageProps) {
  await requireDatasetVisible('places');
  const { placeId } = await params;
  const place = await getSharePlace(safeDecode(placeId));

  if (!place || !isPublicPlaceVisible(place.source, (await getDatasetVisibility()).hidden)) {
    notFound();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: place.name,
    description: cleanCulturalText(place.description),
    url: getShareUrl(place.id),
    image: place.imageUrls?.filter(Boolean),
    address: {
      '@type': 'PostalAddress',
      addressRegion: place.provinceName,
      addressLocality: place.district,
      addressCountry: 'TH',
    },
    geo: { '@type': 'GeoCoordinates', latitude: place.lat, longitude: place.lng },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <CulturePlaceDetailView place={place} />
    </>
  );
}
