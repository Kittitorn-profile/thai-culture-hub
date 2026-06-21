'use client';

import type { Feature, Geometry, GeoJsonProperties, FeatureCollection } from 'geojson';
import type { CulturalPlace } from 'src/sections/province/province-data';
import type { CategoryConfigMap } from 'src/sections/province/category-config';

import { useQuery } from '@tanstack/react-query';
import { geoPath, geoCentroid, geoMercator } from 'd3-geo';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Popover from '@mui/material/Popover';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, CircularProgress } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import provinces from 'src/data/thailand-culture/provinces';

import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import { getProvinceCulturalPlaces } from 'src/sections/province/province-data';
import { getCategoryColor, useCategoryConfig } from 'src/sections/province/category-config';
import { rewindGeoJson, useThailandProvincesGeoJson } from 'src/sections/province/thailand-geojson';

// ----------------------------------------------------------------------

type ThailandProvince = {
  id?: string;
  name: string;
  iso?: string;
};

type ThailandProvinceFeature = Feature<Geometry, GeoJsonProperties> & {
  rsmKey?: string;
};

type ThailandProvinceMapItem = {
  id: string;
  pathData: string;
  province: ThailandProvince;
  provinceCenter: {
    lat: number;
    lng: number;
  };
  provinceFill: string;
};

type ProvinceSearchOption = ThailandProvinceMapItem & {
  provinceId: string;
  displayName: string;
  searchText: string;
};

type ProvinceCategoryCounts = Record<string, number>;

type ProvinceCategorySummary = {
  color: string;
  counts: ProvinceCategoryCounts;
  dominantCategory: string;
};

type ProvinceCategorySummaryMap = Record<string, ProvinceCategorySummary>;

const EMPTY_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
} satisfies FeatureCollection;

const DEFAULT_PROVINCE_FILL = '#ffffff';
const PROVINCE_CATEGORY_SUMMARIES_CACHE_KEY = 'thai-culture-hub:province-category-summaries:v1';
const THAI_PROVINCE_NAME_BY_CODE = new Map(
  provinces.map((province) => [province.code, province.name])
);

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function getProvinceId(province: ThailandProvince) {
  return province.iso ?? province.id ?? '';
}

function getProvinceDisplayName(province: ThailandProvince) {
  const provinceId = getProvinceId(province);

  return (provinceId && THAI_PROVINCE_NAME_BY_CODE.get(provinceId)) || province.name;
}

function getProvinceFromGeography(geo: ThailandProvinceFeature): ThailandProvince {
  const properties = geo.properties ?? {};
  const name = String(properties.shapeName ?? properties.name ?? 'Unknown Province').replace(
    /\s+Province$/,
    ''
  );
  const shapeID = properties.shapeID;
  const shapeISO = properties.shapeISO;

  return {
    name,
    id: typeof shapeID === 'string' ? shapeID : undefined,
    iso: typeof shapeISO === 'string' ? shapeISO : undefined,
  };
}

function getCategoryCounts(places: CulturalPlace[]) {
  const uniquePlaces = new Map<string, CulturalPlace>();

  places.forEach((place) => {
    const placeKey = `${place.name}-${place.district}-${place.lat}-${place.lng}`;

    if (!uniquePlaces.has(placeKey)) {
      uniquePlaces.set(placeKey, place);
    }
  });

  return Array.from(uniquePlaces.values()).reduce<ProvinceCategoryCounts>((counts, place) => {
    if (!place.category) {
      return counts;
    }

    return {
      ...counts,
      [place.category]: (counts[place.category] ?? 0) + 1,
    };
  }, {});
}

function getDominantCategoryFromCounts(counts: ProvinceCategoryCounts) {
  return Object.entries(counts).reduce<string | null>((dominantCategory, [category, count]) => {
    if (!category || !count) {
      return dominantCategory;
    }

    if (!dominantCategory || count > (counts[dominantCategory] ?? 0)) {
      return category;
    }

    return dominantCategory;
  }, null);
}

function getCategorySummary(
  places: CulturalPlace[],
  categoryConfig: CategoryConfigMap
): ProvinceCategorySummary | null {
  if (!places.length) {
    return null;
  }

  const counts = getCategoryCounts(places);
  const dominantCategory = getDominantCategoryFromCounts(counts);

  if (!dominantCategory) {
    return null;
  }

  return {
    counts,
    dominantCategory,
    color: getCategoryColor(categoryConfig, dominantCategory),
  };
}

function getProvinceColor(
  province: ThailandProvince,
  provinceCategorySummaries: ProvinceCategorySummaryMap,
  categoryConfig: CategoryConfigMap
) {
  const provinceId = province.iso ?? province.id ?? '';
  const remoteCategorySummary = provinceId ? provinceCategorySummaries[provinceId] : undefined;

  if (remoteCategorySummary?.color) {
    return remoteCategorySummary.color;
  }

  const places = getProvinceCulturalPlaces(provinceId, province.name);

  if (!places.length) {
    return DEFAULT_PROVINCE_FILL;
  }

  return getCategorySummary(places, categoryConfig)?.color ?? DEFAULT_PROVINCE_FILL;
}

function getMapItems(
  mapGeoJson: FeatureCollection,
  geoPathGenerator: ReturnType<typeof geoPath>,
  provinceCategorySummaries: ProvinceCategorySummaryMap,
  categoryConfig: CategoryConfigMap
) {
  const mapFeatures = Array.isArray(mapGeoJson.features) ? mapGeoJson.features : [];
  const items = mapFeatures.reduce<ThailandProvinceMapItem[]>((provinceItems, geo, index) => {
    const pathData = geoPathGenerator(geo);

    if (!pathData) {
      return provinceItems;
    }

    const province = getProvinceFromGeography(geo);
    const [lng, lat] = geoCentroid(geo);

    provinceItems.push({
      pathData,
      province,
      provinceCenter: { lat, lng },
      provinceFill: getProvinceColor(province, provinceCategorySummaries, categoryConfig),
      id: String(geo.id ?? geo.properties?.shapeID ?? province.iso ?? index),
    });

    return provinceItems;
  }, []);

  return items;
}

function getMapProvinces(mapGeoJson: FeatureCollection) {
  const mapFeatures = Array.isArray(mapGeoJson.features) ? mapGeoJson.features : [];

  return mapFeatures.map((geo) => getProvinceFromGeography(geo));
}

function getMapProvinceIds(mapGeoJson: FeatureCollection) {
  return getMapProvinces(mapGeoJson)
    .map((province) => province.iso ?? province.id)
    .filter((provinceId): provinceId is string => Boolean(provinceId));
}

function getProvinceIdsCacheKey(provinceIds: string[]) {
  return provinceIds.join('|');
}

function getCategoryConfigCacheKey(categoryConfig: CategoryConfigMap) {
  return Object.values(categoryConfig)
    .map((category) => `${category.key}:${category.color}`)
    .sort()
    .join('|');
}

function isProvinceCategorySummaryMap(value: unknown): value is ProvinceCategorySummaryMap {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getCachedProvinceCategorySummaries(provinceIds: string[], categoryConfigKey: string) {
  if (typeof window === 'undefined' || !provinceIds.length) {
    return undefined;
  }

  const cachedValue = window.localStorage.getItem(PROVINCE_CATEGORY_SUMMARIES_CACHE_KEY);

  if (!cachedValue) {
    return undefined;
  }

  try {
    const parsedValue = JSON.parse(cachedValue) as {
      provinceIdsKey?: string;
      categoryConfigKey?: string;
      summaries?: unknown;
    };

    if (
      parsedValue.provinceIdsKey !== getProvinceIdsCacheKey(provinceIds) ||
      parsedValue.categoryConfigKey !== categoryConfigKey ||
      !isProvinceCategorySummaryMap(parsedValue.summaries)
    ) {
      return undefined;
    }

    return parsedValue.summaries;
  } catch {
    return undefined;
  }
}

function setCachedProvinceCategorySummaries(
  provinceIds: string[],
  summaries: ProvinceCategorySummaryMap,
  categoryConfigKey: string
) {
  if (typeof window === 'undefined' || !provinceIds.length) {
    return;
  }

  window.localStorage.setItem(
    PROVINCE_CATEGORY_SUMMARIES_CACHE_KEY,
    JSON.stringify({
      summaries,
      provinceIdsKey: getProvinceIdsCacheKey(provinceIds),
      categoryConfigKey,
    })
  );
}

function fetchProvincePlacesApi(url: string, signal: AbortSignal) {
  return fetch(url, { signal }).catch((error) => {
    if (error?.name === 'AbortError') {
      throw error;
    }

    return null;
  });
}

async function fetchProvinceApiPlaces(provinceId: string, signal: AbortSignal) {
  const response = await fetchProvincePlacesApi(
    `/api/culture/province-places?provinceCode=${provinceId}&limit=100&summary=true`,
    signal
  );
  const json = response?.ok ? await response.json() : { data: [] };

  return Array.isArray(json?.data) ? (json.data as CulturalPlace[]) : [];
}

async function fetchProvinceCategorySummaries(
  provinceIds: string[],
  signal: AbortSignal,
  categoryConfig: CategoryConfigMap
) {
  const entries = await Promise.all(
    provinceIds.map(async (provinceId) => {
      const places = await fetchProvinceApiPlaces(provinceId, signal);
      const summary = getCategorySummary(places, categoryConfig);

      return summary ? [provinceId, summary] : null;
    })
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [string, ProvinceCategorySummary] => Boolean(entry))
  );
}

export default function ThailandMap() {
  const theme = useTheme();
  const router = useRouter();
  const categoryConfig = useCategoryConfig();
  const { data: mapGeoJson = EMPTY_GEOJSON, isLoading: isMapGeoJsonLoading } =
    useThailandProvincesGeoJson({
      select: rewindGeoJson,
    });
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverAnchor, setPopoverAnchor] = useState<SVGPathElement | null>(null);
  const [popoverProvince, setPopoverProvince] = useState<ThailandProvince | null>(null);
  const projection = useMemo(
    () => geoMercator().center([101.49, 13.04]).scale(3000).translate([480, 380]),
    []
  );
  const geoPathGenerator = useMemo(() => geoPath(projection), [projection]);
  const provinceIds = useMemo(() => getMapProvinceIds(mapGeoJson), [mapGeoJson]);
  const categoryConfigKey = useMemo(
    () => getCategoryConfigCacheKey(categoryConfig),
    [categoryConfig]
  );
  const provinceSummaryQueryKey = useMemo(
    () => [
      'thailand',
      'province-category-summaries',
      getProvinceIdsCacheKey(provinceIds),
      categoryConfigKey,
    ],
    [categoryConfigKey, provinceIds]
  );
  const {
    data: provinceCategorySummaries = {},
    isSuccess: isProvinceSummarySuccess,
    isLoading: isProvinceSummaryLoading,
  } = useQuery({
    enabled: provinceIds.length > 0,
    queryKey: provinceSummaryQueryKey,
    queryFn: ({ signal }) => fetchProvinceCategorySummaries(provinceIds, signal, categoryConfig),
    initialData: () => getCachedProvinceCategorySummaries(provinceIds, categoryConfigKey),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const mapItems = useMemo(
    () => getMapItems(mapGeoJson, geoPathGenerator, provinceCategorySummaries, categoryConfig),
    [categoryConfig, geoPathGenerator, mapGeoJson, provinceCategorySummaries]
  );
  const normalizedSearchQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const provinceSearchOptions = useMemo<ProvinceSearchOption[]>(
    () =>
      mapItems.map((item) => {
        const provinceId = getProvinceId(item.province);
        const displayName = getProvinceDisplayName(item.province);

        return {
          ...item,
          provinceId,
          displayName,
          searchText: normalizeSearchText(
            `${displayName} ${item.province.name} ${item.province.iso ?? ''} ${
              item.province.id ?? ''
            }`
          ),
        };
      }),
    [mapItems]
  );
  const matchedProvinceSearchOptions = useMemo(
    () =>
      normalizedSearchQuery
        ? provinceSearchOptions
            .filter((option) => option.searchText.includes(normalizedSearchQuery))
            .slice(0, 8)
        : [],
    [normalizedSearchQuery, provinceSearchOptions]
  );

  const isMapLoading = isMapGeoJsonLoading || isProvinceSummaryLoading;
  const hasMapContent = mapItems.length > 0;
  const showProvinceSearchResults = Boolean(normalizedSearchQuery);
  const popoverProvinceId = popoverProvince ? getProvinceId(popoverProvince) : '';
  const popoverProvinceDisplayName = popoverProvince ? getProvinceDisplayName(popoverProvince) : '';
  const popoverProvinceSummary = popoverProvinceId
    ? provinceCategorySummaries[popoverProvinceId]
    : undefined;
  const popoverProvinceCenter = popoverProvinceId
    ? mapItems.find((item) => getProvinceId(item.province) === popoverProvinceId)?.provinceCenter
    : undefined;
  const popoverProvinceCoordinate = popoverProvinceCenter
    ? `Lat ${popoverProvinceCenter.lat.toFixed(7)}, Lng ${popoverProvinceCenter.lng.toFixed(7)}`
    : 'Lat / Lng';
  const popoverAccentColor = popoverProvinceSummary?.color ?? '#d98b35';

  useEffect(() => {
    if (isProvinceSummarySuccess) {
      setCachedProvinceCategorySummaries(provinceIds, provinceCategorySummaries, categoryConfigKey);
    }
  }, [categoryConfigKey, isProvinceSummarySuccess, provinceCategorySummaries, provinceIds]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      trackAnalyticsEvent('province_search', query, {
        query,
        resultCount: matchedProvinceSearchOptions.length,
      });
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [matchedProvinceSearchOptions.length, searchQuery]);

  const handleToggleProvincePopover = useCallback(
    (event: React.SyntheticEvent<SVGPathElement>, province: ThailandProvince) => {
      const anchor = event.currentTarget;

      setPopoverAnchor((currentAnchor) => {
        if (currentAnchor === anchor) {
          setPopoverProvince(null);
          return null;
        }

        trackAnalyticsEvent('province_map_click', getProvinceDisplayName(province), {
          provinceId: getProvinceId(province),
          provinceName: getProvinceDisplayName(province),
        });
        setPopoverProvince(province);
        return anchor;
      });
    },
    []
  );

  const handleCloseProvincePopover = useCallback(() => {
    setPopoverAnchor(null);
    setPopoverProvince(null);
  }, []);

  const handleViewProvinceDetails = useCallback(() => {
    if (!popoverProvince) {
      return;
    }

    const provinceId = getProvinceId(popoverProvince);

    if (provinceId) {
      trackAnalyticsEvent('province_select', getProvinceDisplayName(popoverProvince), {
        provinceId,
        provinceName: getProvinceDisplayName(popoverProvince),
        source: 'map_popover',
      });
      handleCloseProvincePopover();
      router.push(paths.province.details(provinceId, getProvinceDisplayName(popoverProvince)));
    }
  }, [handleCloseProvincePopover, popoverProvince, router]);

  const handleSelectSearchProvince = useCallback(
    (province: ThailandProvince) => {
      const provinceId = getProvinceId(province);

      if (!provinceId) {
        return;
      }

      setSearchQuery('');
      trackAnalyticsEvent('province_select', getProvinceDisplayName(province), {
        provinceId,
        provinceName: getProvinceDisplayName(province),
        query: searchQuery.trim(),
        source: 'province_search',
      });
      handleCloseProvincePopover();
      router.push(paths.province.details(provinceId, getProvinceDisplayName(province)));
    },
    [handleCloseProvincePopover, router, searchQuery]
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || matchedProvinceSearchOptions.length === 0) {
        return;
      }

      event.preventDefault();
      handleSelectSearchProvince(matchedProvinceSearchOptions[0].province);
    },
    [handleSelectSearchProvince, matchedProvinceSearchOptions]
  );

  const provincePathElements = useMemo(
    () =>
      mapItems.map(({ id, pathData, province, provinceFill }) => {
        const displayName = getProvinceDisplayName(province);
        const searchText = normalizeSearchText(
          `${displayName} ${province.name} ${province.iso ?? ''} ${province.id ?? ''}`
        );
        const isMatched = !!normalizedSearchQuery && searchText.includes(normalizedSearchQuery);
        const isSelected =
          !!popoverProvince &&
          (popoverProvince.iso ?? popoverProvince.id) === (province.iso ?? province.id);
        const matchedFill = theme.palette.secondary.main;
        const selectedFill = '#ffffff';

        return (
          <path
            key={id}
            d={pathData}
            role="button"
            aria-label={`Select ${displayName}`}
            tabIndex={0}
            fill={isSelected ? selectedFill : isMatched ? matchedFill : provinceFill}
            stroke={isSelected ? '#ffffff' : alpha('#ffffff', 0.68)}
            strokeWidth={isSelected ? 2 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            onClick={(event) => {
              handleToggleProvincePopover(event, province);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleToggleProvincePopover(event, province);
              }
            }}
            style={{
              cursor: 'pointer',
              outline: 'none',
              transition: 'fill 140ms ease, opacity 140ms ease',
            }}
          >
            <title>{displayName}</title>
          </path>
        );
      }),
    [
      handleToggleProvincePopover,
      mapItems,
      normalizedSearchQuery,
      popoverProvince,
      theme.palette.secondary.main,
    ]
  );

  return (
    <Box
      sx={{
        overflow: 'hidden',
        position: 'relative',
        minHeight: { xs: 780, md: 1040 },
        bgcolor: 'transparent',
      }}
    >
      <Box
        sx={{
          top: { xs: 18, md: '40%' },
          left: 0,
          zIndex: 3,
          maxWidth: { xs: 290, sm: 360 },
          position: 'absolute',
        }}
      >
        <Typography
          sx={{
            color: theme.palette.common.white,
            fontSize: { xs: 24, sm: 36 },
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          แผนที่วัฒนธรรมไทย
        </Typography>
        <Typography
          sx={{
            mt: 0.8,
            color: alpha(theme.palette.common.white, 0.74),
            fontSize: { xs: 12, sm: 15 },
            fontWeight: 700,
            lineHeight: 1.45,
          }}
        >
          คลิกจังหวัดเพื่อสำรวจประเพณี อาหาร หัตถกรรม ภาษา และเรื่องเล่าของแต่ละพื้นที่
        </Typography>

        <Box
          sx={{
            zIndex: 3,
            width: { xs: 220, sm: 270 },
            height: 44,
            mt: 2,
            px: 1.4,
            gap: 1,
            display: 'flex',
            borderRadius: 99,
            position: 'absolute',
            alignItems: 'center',
            bgcolor: alpha(theme.palette.common.white, 0.9),
            border: `1px solid ${alpha(theme.palette.grey[600], 0.42)}`,
            boxShadow: `0 12px 30px ${alpha(theme.palette.primary.darker, 0.08)}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Iconify icon="eva:search-fill" width={21} sx={{ color: theme.palette.grey[800] }} />
          <InputBase
            value={searchQuery}
            placeholder="ค้นหาจังหวัด"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{
              flex: 1,
              minWidth: 0,
              color: theme.palette.grey[900],
              fontSize: 14,
              fontWeight: 600,
              '& input::placeholder': {
                color: theme.palette.grey[500],
                opacity: 1,
              },
            }}
          />
          {!!searchQuery && (
            <Box
              component="button"
              type="button"
              aria-label="ล้างคำค้นหา"
              onClick={() => setSearchQuery('')}
              sx={{
                p: 0,
                m: 0,
                width: 24,
                height: 24,
                border: 0,
                display: 'grid',
                flexShrink: 0,
                cursor: 'pointer',
                borderRadius: '50%',
                placeItems: 'center',
                color: theme.palette.grey[700],
                bgcolor: alpha(theme.palette.grey[500], 0.14),
                '&:hover': {
                  bgcolor: alpha(theme.palette.grey[500], 0.22),
                },
              }}
            >
              <Iconify icon="mingcute:close-line" width={16} />
            </Box>
          )}

          {showProvinceSearchResults && (
            <Box
              sx={{
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                zIndex: 4,
                p: 0.6,
                overflow: 'hidden',
                borderRadius: 2,
                position: 'absolute',
                bgcolor: alpha(theme.palette.common.white, 0.96),
                border: `1px solid ${alpha(theme.palette.grey[500], 0.22)}`,
                boxShadow: `0 18px 44px ${alpha(theme.palette.grey[900], 0.18)}`,
                backdropFilter: 'blur(12px)',
              }}
            >
              {matchedProvinceSearchOptions.length > 0 ? (
                matchedProvinceSearchOptions.map((option) => (
                  <Box
                    key={option.id}
                    component="button"
                    type="button"
                    onClick={() => handleSelectSearchProvince(option.province)}
                    sx={{
                      p: 1,
                      m: 0,
                      gap: 1,
                      width: 1,
                      border: 0,
                      display: 'flex',
                      cursor: 'pointer',
                      borderRadius: 1.5,
                      textAlign: 'left',
                      alignItems: 'center',
                      color: theme.palette.grey[900],
                      bgcolor: 'transparent',
                      '&:hover, &:focus-visible': {
                        outline: 'none',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        flexShrink: 0,
                        borderRadius: '50%',
                        bgcolor: option.provinceFill,
                        border: `1px solid ${alpha('#6d4b2c', 0.34)}`,
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>
                        {option.displayName}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.15,
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          color: theme.palette.grey[600],
                        }}
                      >
                        {option.provinceId}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography
                  sx={{
                    px: 1,
                    py: 1.2,
                    color: theme.palette.grey[600],
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  ไม่พบจังหวัดที่ค้นหา
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          pt: { xs: 8, md: 4 },
          px: 0,
          pb: 4,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            mx: 'auto',
            width: { xs: hasMapContent ? '150vw' : 1, sm: 1 },
            maxWidth: { xs: 'none', sm: 1000 },
            height: { xs: 980, sm: 820, md: 1000 },
            flexShrink: 0,
            borderRadius: 1.5,
            overflow: 'hidden',
            '& svg': {
              width: '100%',
              height: '100%',
              display: 'block',
              outline: 'none',
            },
            '& path': {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              vectorEffect: 'non-scaling-stroke',
              paintOrder: 'stroke fill',
            },
          }}
        >
          {hasMapContent && (
            <svg
              viewBox="0 0 960 760"
              width={1200}
              height={1000}
              role="img"
              aria-label="Interactive Thailand province map"
            >
              <defs>
                <filter id="paper-noise">
                  <feTurbulence baseFrequency="0.9" numOctaves="2" seed="8" type="fractalNoise" />
                  <feColorMatrix type="saturate" values="0" />
                  <feComponentTransfer>
                    <feFuncA slope="0.08" type="linear" />
                  </feComponentTransfer>
                </filter>
              </defs>
              <rect
                width="960"
                height="760"
                fill="#ffffff"
                filter="url(#paper-noise)"
                opacity="0.22"
              />
              <path
                d="M 622 22 C 592 92 642 128 603 202 C 565 276 624 332 582 416 C 548 485 583 548 548 626"
                fill="none"
                stroke="#59abb0"
                strokeWidth={14}
                strokeLinecap="round"
                opacity={0.38}
              />
              <path
                d="M 108 78 C 184 126 156 172 224 213 C 310 265 277 332 356 388 C 441 449 410 524 494 600 C 548 650 609 650 676 704"
                fill="none"
                stroke="#c37235"
                strokeWidth={3}
                strokeDasharray="10 12"
                strokeLinecap="round"
                opacity={0.64}
              />
              <path
                d="M 818 92 C 754 142 804 216 738 268 C 670 322 726 414 642 474"
                fill="none"
                stroke="#ffffff"
                strokeWidth={3}
                strokeDasharray="8 12"
                strokeLinecap="round"
                opacity={0.42}
              />
              <text
                x="735"
                y="176"
                fill="#ffffff"
                fontSize={22}
                fontWeight={800}
                letterSpacing={18}
                opacity={0.5}
                transform="rotate(-18 735 176)"
              >
                LAOS
              </text>
              <text
                x="684"
                y="698"
                fill="#ffffff"
                fontSize={22}
                fontWeight={800}
                letterSpacing={18}
                opacity={0.42}
                transform="rotate(12 684 698)"
              >
                SEA
              </text>
              {provincePathElements}
            </svg>
          )}

          {isMapLoading && (
            <Box
              role="status"
              aria-live="polite"
              sx={{
                inset: 0,
                zIndex: 2,
                display: 'grid',
                position: 'absolute',
                placeItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.4,
                  gap: 1.2,
                  display: 'flex',
                  borderRadius: 99,
                  alignItems: 'center',
                  color: theme.palette.common.white,
                  bgcolor: alpha('#1f170f', 0.72),
                  boxShadow: `0 16px 42px ${alpha('#000000', 0.22)}`,
                }}
              >
                <CircularProgress size={20} thickness={5} sx={{ color: '#f5d266' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                  กำลังโหลดข้อมูลแผนที่
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Popover
        open={Boolean(popoverAnchor && popoverProvince)}
        anchorEl={popoverAnchor}
        onClose={handleCloseProvincePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            onMouseLeave: handleCloseProvincePopover,
            sx: {
              mt: 1.8,
              width: { xs: 272, sm: 310 },
              p: 1,
              borderRadius: 3.2,
              overflow: 'visible',
              color: '#263331',
              bgcolor: alpha('#fbfaf3', 0.97),
              border: `1px solid ${alpha('#fff8e6', 0.86)}`,
              boxShadow: `0 28px 80px ${alpha('#2f2418', 0.28)}, inset 0 1px 0 ${alpha(
                '#ffffff',
                0.72
              )}`,
              backdropFilter: 'blur(16px)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -10,
                left: '50%',
                width: 20,
                height: 20,
                bgcolor: alpha('#fbfaf3', 0.97),
                transform: 'translateX(-50%) rotate(45deg)',
                borderRadius: 0.4,
                borderTop: `1px solid ${alpha('#fff8e6', 0.86)}`,
                borderLeft: `1px solid ${alpha('#fff8e6', 0.86)}`,
              },
            },
          },
        }}
      >
        {popoverProvince && (
          <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2.4 }}>
            <Box
              sx={{
                position: 'absolute',
                top: -42,
                right: -48,
                width: 124,
                height: 124,
                borderRadius: '50%',
                bgcolor: alpha(popoverAccentColor, 0.13),
              }}
            />
            <Box
              sx={{
                p: 1.3,
                display: 'flex',
                gap: 1.2,
                alignItems: 'center',
                position: 'relative',
                borderRadius: 2.2,
                background:
                  'linear-gradient(135deg, rgba(244,237,208,0.98), rgba(231,228,204,0.88))',
                border: `1px solid ${alpha('#ffffff', 0.82)}`,
              }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  display: 'grid',
                  flexShrink: 0,
                  borderRadius: '50%',
                  placeItems: 'center',
                  color: '#7a311f',
                  bgcolor: '#f8d36a',
                  border: `3px solid ${alpha('#7b3d27', 0.94)}`,
                  boxShadow: `0 10px 22px ${alpha('#6f3d24', 0.18)}`,
                }}
              >
                <Iconify icon="custom:location-fill" width={22} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    color: '#1f2e2c',
                    fontSize: 18,
                    fontWeight: 950,
                    lineHeight: 1.14,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {popoverProvinceDisplayName}
                </Typography>
                <Typography sx={{ mt: 0.15, color: '#64716f', fontSize: 12, fontWeight: 800 }}>
                  จังหวัด
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                px: 1.4,
                pt: 1.5,
                pb: 1.2,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 1.6,
                  top: 20,
                  bottom: 18,
                  width: 1,
                },
              }}
            >
              {[popoverProvinceCoordinate].map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.1, py: 0.5 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      zIndex: 1,
                      flexShrink: 0,
                      borderRadius: '50%',
                      bgcolor: popoverAccentColor,
                      boxShadow: `0 0 0 3px ${alpha(popoverAccentColor, 0.13)}`,
                    }}
                  />
                  <Typography sx={{ color: '#233331', fontSize: 13, fontWeight: 800 }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Button
              onClick={handleViewProvinceDetails}
              color="primary"
              variant="contained"
              sx={{
                width: 1,
                m: 0,
                py: 1.05,
                px: 1.5,
                cursor: 'pointer',
                display: 'flex',
                borderRadius: 2.2,
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fffdf6',
                bgcolor: '#827568',
                fontSize: 14,
                fontWeight: 900,
                boxShadow: `0 14px 30px ${alpha('#4a3525', 0.22)}`,
                '&:hover': {
                  bgcolor: '#6f6257',
                  boxShadow: `0 18px 36px ${alpha('#4a3525', 0.28)}`,
                },
              }}
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
            >
              ดูรายละเอียด
            </Button>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
