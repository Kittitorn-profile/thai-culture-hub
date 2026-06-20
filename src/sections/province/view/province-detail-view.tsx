'use client';

import type { CulturalPlace } from '../province-data';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import { ProvinceShapeMap } from './province-shape-map';
import { getPlaceImages } from './province-detail-utils';
import { ProvincePlaceDialog } from './province-place-dialog';
import { ProvinceFilterDrawer } from './province-filter-drawer';
import { ProvincePlacesDrawer } from './province-places-drawer';
import { ProvinceDetailHeader } from './province-detail-header';
import { useThailandDistrictCenters } from '../thailand-geojson';
import {
  getCultureMetrics,
  getProvinceDisplayName,
  CULTURE_CATEGORY_LABELS,
  getProvinceCulturalPlaces,
} from '../province-data';

// ----------------------------------------------------------------------

type RemoteSourceCounts = Partial<
  Record<
    | 'tat'
    | 'finearts_monument'
    | 'finearts_archeology'
    | 'finearts_buddha'
    | 'finearts_museum'
    | 'culture_catalog',
    { count?: number }
  >
>;

type DistrictCenter = {
  name: string;
  lat: number;
  lng: number;
};

const PROVINCE_BG_TOP = '#6f8790';
const PROVINCE_BG_MIDDLE = '#7b8476';
const PROVINCE_BG_BOTTOM = '#8f7c5c';
const PROVINCE_PAGE_BACKGROUND = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${PROVINCE_BG_TOP} 0%, ${PROVINCE_BG_MIDDLE} 54%, ${PROVINCE_BG_BOTTOM} 100%)
`;
const PROVINCE_POSTER_PATTERN = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;
// const PROVINCE_GRID_BACKGROUND = `
//   linear-gradient(90deg, rgba(248,246,238,0.08) 1px, transparent 1px),
//   linear-gradient(180deg, rgba(248,246,238,0.08) 1px, transparent 1px)
// `;

// ----------------------------------------------------------------------

function normalizeDistrictName(value?: string | null) {
  return (value ?? '')
    .replace(/^อำเภอ/, '')
    .replace(/^เขต/, '')
    .replace(/\s+District$/i, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function getNearestDistrictName(place: CulturalPlace, districtCenters: DistrictCenter[]) {
  const placeLat = Number(place.lat);
  const placeLng = Number(place.lng);

  if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng) || !districtCenters.length) {
    return place.district;
  }

  let nearestDistrict = '';
  let nearestDistance = Infinity;

  districtCenters.forEach((district) => {
    const distance = Math.hypot(placeLat - district.lat, placeLng - district.lng);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestDistrict = district.name;
    }
  });

  return nearestDistrict || place.district;
}

function resolvePlaceDistricts(places: CulturalPlace[], districtCenters: DistrictCenter[]) {
  if (!districtCenters.length) {
    return places;
  }

  const districtNameMap = new Map(
    districtCenters.map((district) => [normalizeDistrictName(district.name), district.name])
  );

  return places.map((place) => {
    const districtName = districtNameMap.get(normalizeDistrictName(place.district));
    const resolvedDistrict = districtName ?? getNearestDistrictName(place, districtCenters);

    return resolvedDistrict && resolvedDistrict !== place.district
      ? { ...place, district: resolvedDistrict }
      : place;
  });
}

export function ProvinceDetailView() {
  const theme = useTheme();
  const params = useParams<{ provinceId?: string | string[] }>();
  const searchParams = useSearchParams();
  const rawProvinceId = params.provinceId;
  const provinceId = (Array.isArray(rawProvinceId) ? rawProvinceId[0] : rawProvinceId) ?? '';
  const provinceName = searchParams.get('name') ?? undefined;
  const provinceDisplayName = getProvinceDisplayName(provinceId, provinceName);
  const localCulturalPlaces = useMemo(
    () => getProvinceCulturalPlaces(provinceId, provinceName),
    [provinceId, provinceName]
  );
  const { data: districtCentersData } = useThailandDistrictCenters(provinceId);
  const [remoteCulturalPlaces, setRemoteCulturalPlaces] = useState<CulturalPlace[]>([]);
  const [remoteSourceCounts, setRemoteSourceCounts] = useState<RemoteSourceCounts>({});
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlacesDrawerOpen, setIsPlacesDrawerOpen] = useState(false);
  const [selectedDistrictDetail, setSelectedDistrictDetail] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CulturalPlace | null>(null);
  const filterEventKey = [
    selectedSources.join('|'),
    selectedCategories.join('|'),
    selectedDistricts.join('|'),
  ].join('::');

  const allCulturalPlaces = useMemo(
    () =>
      resolvePlaceDistricts(
        remoteCulturalPlaces.length ? remoteCulturalPlaces : localCulturalPlaces,
        districtCentersData?.districts ?? []
      ),
    [districtCentersData?.districts, localCulturalPlaces, remoteCulturalPlaces]
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(allCulturalPlaces.map((place) => place.category))),
    [allCulturalPlaces]
  );
  const sourceOptions = useMemo(
    () => Array.from(new Set(allCulturalPlaces.map((place) => place.source ?? 'local'))),
    [allCulturalPlaces]
  );
  const districtOptions = useMemo(
    () =>
      Array.from(new Set(allCulturalPlaces.map((place) => place.district || 'ไม่ระบุอำเภอ'))).sort(
        (a, b) => a.localeCompare(b, 'th')
      ),
    [allCulturalPlaces]
  );
  const culturalPlaces = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase('th');

    return allCulturalPlaces.filter((place) => {
      const source = place.source ?? 'local';
      const district = place.district || 'ไม่ระบุอำเภอ';
      const isCategoryMatched =
        selectedCategories.length === 0 || selectedCategories.includes(place.category);
      const isSourceMatched = selectedSources.length === 0 || selectedSources.includes(source);
      const isDistrictMatched =
        selectedDistricts.length === 0 || selectedDistricts.includes(district);
      const searchText = [
        place.name,
        district,
        place.highlight,
        place.description,
        CULTURE_CATEGORY_LABELS[place.category],
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th');
      const isSearchMatched = !normalizedSearchQuery || searchText.includes(normalizedSearchQuery);

      return isCategoryMatched && isSourceMatched && isDistrictMatched && isSearchMatched;
    });
  }, [allCulturalPlaces, searchQuery, selectedCategories, selectedDistricts, selectedSources]);
  const activeFilterCount =
    selectedCategories.length + selectedSources.length + selectedDistricts.length;
  const cultureMetrics = useMemo(() => getCultureMetrics(culturalPlaces), [culturalPlaces]);
  const selectedDistrictPlaces = useMemo(
    () =>
      selectedDistrictDetail
        ? culturalPlaces.filter(
            (place) => (place.district || 'ไม่ระบุอำเภอ') === selectedDistrictDetail
          )
        : [],
    [culturalPlaces, selectedDistrictDetail]
  );
  const drawerPlaces = selectedDistrictDetail ? selectedDistrictPlaces : culturalPlaces;
  const selectedPlaceIndex = selectedPlace
    ? Math.max(
        culturalPlaces.findIndex((place) => place.id === selectedPlace.id),
        0
      )
    : 0;
  const selectedPlaceImages = selectedPlace
    ? getPlaceImages(selectedPlace, selectedPlaceIndex)
    : [];
  const selectedPlaceLat = Number(selectedPlace?.lat);
  const selectedPlaceLng = Number(selectedPlace?.lng);
  const selectedPlaceCoordinates =
    Number.isFinite(selectedPlaceLat) && Number.isFinite(selectedPlaceLng)
      ? `${selectedPlaceLat}, ${selectedPlaceLng}`
      : 'ไม่พบพิกัด';
  const dataSourceLabel = [
    remoteSourceCounts.tat?.count ? 'ททท.' : null,
    remoteSourceCounts.finearts_monument?.count ||
    remoteSourceCounts.finearts_archeology?.count ||
    remoteSourceCounts.finearts_buddha?.count ||
    remoteSourceCounts.finearts_museum?.count
      ? 'กรมศิลป์'
      : null,
    remoteSourceCounts.culture_catalog?.count ? 'ข้อมูลวัฒนธรรม' : null,
  ]
    .filter(Boolean)
    .join(' + ');

  const closePlacesDrawer = () => {
    setSelectedDistrictDetail(null);
    setIsPlacesDrawerOpen(false);
  };

  const openAllPlacesDrawer = () => {
    trackAnalyticsEvent('province_places_open', provinceDisplayName, {
      provinceId,
      provinceName: provinceDisplayName,
      totalCount: allCulturalPlaces.length,
      filteredCount: culturalPlaces.length,
    });
    setSelectedDistrictDetail(null);
    setIsPlacesDrawerOpen(true);
  };

  useEffect(() => {
    if (!provinceId) {
      return undefined;
    }

    const controller = new AbortController();

    setIsRemoteLoading(true);
    setRemoteCulturalPlaces([]);
    setRemoteSourceCounts({});

    fetch(`/api/culture/province-places?provinceCode=${provinceId}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { data: [], sources: {} }))
      .then((response: { data?: CulturalPlace[]; sources?: RemoteSourceCounts }) => {
        if (!controller.signal.aborted) {
          setRemoteCulturalPlaces(Array.isArray(response.data) ? response.data : []);
          setRemoteSourceCounts(response.sources ?? {});
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setRemoteCulturalPlaces([]);
          setRemoteSourceCounts({});
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsRemoteLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [provinceId]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      trackAnalyticsEvent('province_place_search', query, {
        query,
        provinceId,
        provinceName: provinceDisplayName,
        resultCount: culturalPlaces.length,
      });
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [culturalPlaces.length, provinceDisplayName, provinceId, searchQuery]);

  useEffect(() => {
    if (!filterEventKey.replace(/:/g, '')) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      trackAnalyticsEvent('province_filter_change', provinceDisplayName, {
        provinceId,
        provinceName: provinceDisplayName,
        sources: selectedSources.join(','),
        categories: selectedCategories.join(','),
        districts: selectedDistricts.join(','),
        resultCount: culturalPlaces.length,
      });
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    culturalPlaces.length,
    filterEventKey,
    provinceDisplayName,
    provinceId,
    selectedCategories,
    selectedDistricts,
    selectedSources,
  ]);

  const handleDistrictSelect = (district: string) => {
    trackAnalyticsEvent('district_select', district, {
      district,
      provinceId,
      provinceName: provinceDisplayName,
    });
    setSelectedDistrictDetail(district);
  };

  const handlePlaceSelect = (place: CulturalPlace | null) => {
    if (place) {
      trackAnalyticsEvent('place_select', place.name, {
        placeId: place.id,
        placeName: place.name,
        district: place.district,
        category: place.category,
        provinceId,
        provinceName: provinceDisplayName,
      });
    }

    setSelectedPlace(place);
  };

  return (
    <Box
      component="main"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: PROVINCE_BG_MIDDLE,
        backgroundImage: PROVINCE_PAGE_BACKGROUND,
        color: 'text.primary',
        minHeight: '100vh',
        py: { xs: 3, md: '7%' },
        px: { xs: 2, md: '20%' },
        fontFamily: "'LINE Seed Sans TH', sans-serif",
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: PROVINCE_POSTER_PATTERN,
          transform: 'rotate(-4deg)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: 0.9,
          pointerEvents: 'none',
          backgroundSize: { xs: '72px 72px', md: '120px 120px' },
        },
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          width: 1,
          zIndex: 1,
          maxWidth: '100%',
          position: 'relative',
        }}
      >
        <Box sx={{ mx: 'auto', maxWidth: 980, position: 'relative' }}>
          <ProvinceDetailHeader
            provinceDisplayName={provinceDisplayName}
            cultureMetrics={cultureMetrics}
            filteredCount={culturalPlaces.length}
            totalCount={allCulturalPlaces.length}
            dataSourceLabel={dataSourceLabel}
            isRemoteLoading={isRemoteLoading}
            activeFilterCount={activeFilterCount}
            searchQuery={searchQuery}
            onFilterOpen={() => setIsFilterOpen(true)}
            onPlacesOpen={openAllPlacesDrawer}
            onSearchQueryChange={setSearchQuery}
          />
        </Box>

        <Box sx={{ mt: 4 }}>
          {!!provinceId && (
            <ProvinceShapeMap
              places={culturalPlaces}
              provinceId={provinceId}
              provinceName={provinceDisplayName}
              onDistrictSelect={handleDistrictSelect}
            />
          )}
        </Box>

        <Stack direction="row" justifyContent="center" sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Iconify icon="solar:list-bold" />}
            onClick={openAllPlacesDrawer}
            sx={{
              px: 3,
              borderRadius: 99,
              fontWeight: 900,
              color: '#11343a',
              bgcolor: '#f8f8f2',
              boxShadow: `0 14px 30px ${alpha(theme.palette.grey[900], 0.18)}`,
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            ดูสถานที่และวัฒนธรรมทั้งหมด
          </Button>
        </Stack>

        <ProvinceFilterDrawer
          open={isFilterOpen}
          totalCount={allCulturalPlaces.length}
          filteredCount={culturalPlaces.length}
          sourceOptions={sourceOptions}
          categoryOptions={categoryOptions}
          districtOptions={districtOptions}
          selectedSources={selectedSources}
          selectedCategories={selectedCategories}
          selectedDistricts={selectedDistricts}
          onClose={() => setIsFilterOpen(false)}
          onSelectedSourcesChange={setSelectedSources}
          onSelectedCategoriesChange={setSelectedCategories}
          onSelectedDistrictsChange={setSelectedDistricts}
        />

        <ProvincePlacesDrawer
          open={Boolean(selectedDistrictDetail) || isPlacesDrawerOpen}
          selectedDistrictDetail={selectedDistrictDetail}
          places={drawerPlaces}
          allPlacesCount={allCulturalPlaces.length}
          culturalPlaces={culturalPlaces}
          onClose={closePlacesDrawer}
          onPlaceSelect={handlePlaceSelect}
        />

        <ProvincePlaceDialog
          place={selectedPlace}
          placeIndex={selectedPlaceIndex}
          placeImages={selectedPlaceImages}
          provinceDisplayName={provinceDisplayName}
          coordinates={selectedPlaceCoordinates}
          onClose={() => setSelectedPlace(null)}
        />
      </Box>
    </Box>
  );
}
