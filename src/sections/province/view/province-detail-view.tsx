'use client';

import type { CulturalPlace } from '../province-data';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { ProvinceShapeMap } from './province-shape-map';
import { ProvincePlaceDialog } from './province-place-dialog';
import { ProvinceFilterDrawer } from './province-filter-drawer';
import { ProvincePlacesDrawer } from './province-places-drawer';
import { ProvinceDetailHeader } from './province-detail-header';
import { getPlaceImages, mergeCulturalPlaces } from './province-detail-utils';
import {
  getCultureMetrics,
  getProvinceDisplayName,
  CULTURE_CATEGORY_LABELS,
  getProvinceCulturalPlaces,
} from '../province-data';

// ----------------------------------------------------------------------

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
  const [catalogCulturalPlaces, setCatalogCulturalPlaces] = useState<CulturalPlace[]>([]);
  const [tatCulturalPlaces, setTatCulturalPlaces] = useState<CulturalPlace[]>([]);
  const [fineArtsCulturalPlaces, setFineArtsCulturalPlaces] = useState<CulturalPlace[]>([]);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlacesDrawerOpen, setIsPlacesDrawerOpen] = useState(false);
  const [selectedDistrictDetail, setSelectedDistrictDetail] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CulturalPlace | null>(null);

  const allCulturalPlaces = useMemo(() => {
    const mergedRemotePlaces = mergeCulturalPlaces(
      tatCulturalPlaces,
      fineArtsCulturalPlaces,
      catalogCulturalPlaces
    );

    return mergedRemotePlaces.length ? mergedRemotePlaces : localCulturalPlaces;
  }, [catalogCulturalPlaces, fineArtsCulturalPlaces, localCulturalPlaces, tatCulturalPlaces]);

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
  const culturalPlaces = useMemo(
    () => {
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
        const isSearchMatched =
          !normalizedSearchQuery || searchText.includes(normalizedSearchQuery);

        return isCategoryMatched && isSourceMatched && isDistrictMatched && isSearchMatched;
      });
    },
    [allCulturalPlaces, searchQuery, selectedCategories, selectedDistricts, selectedSources]
  );
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
    tatCulturalPlaces.length ? 'ททท.' : null,
    fineArtsCulturalPlaces.length ? 'กรมศิลป์' : null,
    catalogCulturalPlaces.length ? 'ข้อมูลวัฒนธรรม' : null,
  ]
    .filter(Boolean)
    .join(' + ');

  const closePlacesDrawer = () => {
    setSelectedDistrictDetail(null);
    setIsPlacesDrawerOpen(false);
  };

  const openAllPlacesDrawer = () => {
    setSelectedDistrictDetail(null);
    setIsPlacesDrawerOpen(true);
  };

  useEffect(() => {
    if (!provinceId) {
      return undefined;
    }

    const controller = new AbortController();

    setIsRemoteLoading(true);
    setCatalogCulturalPlaces([]);
    setTatCulturalPlaces([]);
    setFineArtsCulturalPlaces([]);

    Promise.all([
      fetch(`/api/culture/places?provinceCode=${provinceId}&limit=50`, {
        signal: controller.signal,
      }),
      fetch(`/api/tat/places?provinceCode=${provinceId}&limit=50`, {
        signal: controller.signal,
      }),
      fetch(`/api/finearts/archeology?provinceCode=${provinceId}&limit=50`, {
        signal: controller.signal,
      }),
    ])
      .then(async ([cultureResponse, tatResponse, fineArtsResponse]) => {
        const cultureJson = cultureResponse.ok ? await cultureResponse.json() : { data: [] };
        const tatJson = tatResponse.ok ? await tatResponse.json() : { data: [] };
        const fineArtsJson = fineArtsResponse.ok ? await fineArtsResponse.json() : { data: [] };

        return { cultureJson, tatJson, fineArtsJson };
      })
      .then(
        (response: {
          cultureJson?: { data?: CulturalPlace[] };
          tatJson?: { data?: CulturalPlace[] };
          fineArtsJson?: { data?: CulturalPlace[] };
        }) => {
          if (!controller.signal.aborted) {
            setCatalogCulturalPlaces(
              Array.isArray(response.cultureJson?.data) ? response.cultureJson.data : []
            );
            setTatCulturalPlaces(
              Array.isArray(response.tatJson?.data) ? response.tatJson.data : []
            );
            setFineArtsCulturalPlaces(
              Array.isArray(response.fineArtsJson?.data) ? response.fineArtsJson.data : []
            );
          }
        }
      )
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setCatalogCulturalPlaces([]);
          setTatCulturalPlaces([]);
          setFineArtsCulturalPlaces([]);
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
              onDistrictSelect={setSelectedDistrictDetail}
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
          onPlaceSelect={setSelectedPlace}
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
