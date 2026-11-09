'use client';

import type { CulturalPlace } from '../province-data';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import { HOME_SECTION_PX } from 'src/sections/home/components/home-constants';

import { ProvinceIdentity } from './province-identity';
import { ProvinceShapeMap } from './province-shape-map';
import { ProvincePlacesList } from './province-places-list';
import { resolvePlaceDistricts } from '../province-districts';
import { ProvinceFilterDrawer } from './province-filter-drawer';
import { ProvinceDetailHeader } from './province-detail-header';
import { useThailandDistrictCenters } from '../thailand-geojson';
import { ProvinceHighlightPlaces } from './province-highlight-places';
import { ProvinceCulturalSections } from './province-cultural-sections';
import { getCategoryLabel, useCategoryConfig } from '../category-config';
import {
  getCultureMetrics,
  getProvinceDisplayName,
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

const PROVINCE_BG_MIDDLE = '#f7f7f5';
const PROVINCE_PAGE_BACKGROUND = 'none';
const PROVINCE_POSTER_PATTERN = 'none';
// const PROVINCE_GRID_BACKGROUND = 'none';

// ----------------------------------------------------------------------

export function ProvinceDetailView() {
  const categoryConfig = useCategoryConfig();
  const router = useRouter();
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
        getCategoryLabel(categoryConfig, place.category),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th');
      const isSearchMatched = !normalizedSearchQuery || searchText.includes(normalizedSearchQuery);

      return isCategoryMatched && isSourceMatched && isDistrictMatched && isSearchMatched;
    });
  }, [
    allCulturalPlaces,
    categoryConfig,
    searchQuery,
    selectedCategories,
    selectedDistricts,
    selectedSources,
  ]);
  const activeFilterCount =
    selectedCategories.length + selectedSources.length + selectedDistricts.length;
  const cultureMetrics = useMemo(() => getCultureMetrics(culturalPlaces), [culturalPlaces]);
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

  const openAllPlaces = () => {
    trackAnalyticsEvent('province_places_open', provinceDisplayName, {
      provinceId,
      provinceName: provinceDisplayName,
      totalCount: allCulturalPlaces.length,
      filteredCount: culturalPlaces.length,
    });
    router.push(
      `/province/${encodeURIComponent(provinceId)}/places/?${new URLSearchParams({ name: provinceDisplayName }).toString()}`
    );
  };

  useEffect(() => {
    if (!provinceId) {
      return undefined;
    }

    const controller = new AbortController();

    setIsRemoteLoading(true);
    setRemoteCulturalPlaces([]);
    setRemoteSourceCounts({});

    fetch(`/api/culture/province-places?provinceCode=${provinceId}&view=map`, {
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
    router.push(
      `/province/${encodeURIComponent(provinceId)}/places/?${new URLSearchParams({ name: provinceDisplayName, district }).toString()}`
    );
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
        pt: { xs: 4, md: 6 },
        pb: { xs: 5, md: 7 },
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
          maxWidth: 1408,
          px: HOME_SECTION_PX,
          position: 'relative',
        }}
      >
        <Button
          component={RouterLink}
          href="/#explore-map"
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
          sx={{ mb: 2.5, fontSize: 13 }}
        >
          กลับแผนที่ประเทศไทย
        </Button>
        {/* <Button
          component="a"
          href="#province-all-data"
          variant="outlined"
          size="small"
          sx={{ mb: 2.5, ml: 1 }}
        >
          สำรวจทุกชุดข้อมูลของจังหวัด
        </Button> */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '360px minmax(0, 1fr)' },
            gap: { xs: 3, lg: 4 },
            alignItems: 'start',
          }}
        >
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 96 }, minWidth: 0 }}>
            <ProvinceDetailHeader
              provinceCode={provinceId}
              provinceDisplayName={provinceDisplayName}
              cultureMetrics={cultureMetrics}
              filteredCount={culturalPlaces.length}
              totalCount={allCulturalPlaces.length}
              dataSourceLabel={dataSourceLabel}
              isRemoteLoading={isRemoteLoading}
              activeFilterCount={activeFilterCount}
              searchQuery={searchQuery}
              onFilterOpen={() => setIsFilterOpen(true)}
              onPlacesOpen={openAllPlaces}
              onSearchQueryChange={setSearchQuery}
            />
            <ProvinceIdentity provinceCode={provinceId} />
          </Box>

          <Box
            sx={{
              minWidth: 0,
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: '#f0f2eb',
              p: { xs: 1, md: 2 },
            }}
          >
            {!!provinceId && (
              <ProvinceShapeMap
                places={culturalPlaces}
                provinceId={provinceId}
                provinceName={provinceDisplayName}
                categoryConfig={categoryConfig}
                onDistrictSelect={handleDistrictSelect}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ mt: { xs: 4, md: 6 } }}>
          <ProvinceHighlightPlaces
            provinceCode={provinceId}
            provinceName={provinceDisplayName}
            places={allCulturalPlaces}
            loading={isRemoteLoading}
          />
        </Box>
        <ProvinceCulturalSections
          key={provinceId}
          provinceCode={provinceId}
          provinceName={provinceDisplayName}
        />
        <Box component="section" id="province-all-places" sx={{ mt: 5, scrollMarginTop: 100 }}>
          {isRemoteLoading ? (
            <Typography>กำลังโหลดสถานที่…</Typography>
          ) : (
            <ProvincePlacesList
              selectedDistrictDetail={`สถานที่และเรื่องวัฒนธรรม${provinceDisplayName}`}
              places={culturalPlaces}
              categoryConfig={categoryConfig}
              onPlaceSelect={(place) =>
                router.push(`/culture-place/${encodeURIComponent(place.id)}/`)
              }
            />
          )}
        </Box>

        <ProvinceFilterDrawer
          open={isFilterOpen}
          totalCount={allCulturalPlaces.length}
          filteredCount={culturalPlaces.length}
          sourceOptions={sourceOptions}
          categoryOptions={categoryOptions}
          categoryConfig={categoryConfig}
          districtOptions={districtOptions}
          selectedSources={selectedSources}
          selectedCategories={selectedCategories}
          selectedDistricts={selectedDistricts}
          onClose={() => setIsFilterOpen(false)}
          onSelectedSourcesChange={setSelectedSources}
          onSelectedCategoriesChange={setSelectedCategories}
          onSelectedDistrictsChange={setSelectedDistricts}
        />
      </Box>

      <Box textAlign="center" mt={10}>
        <Logo sx={{ width: 200, height: '100%' }} isSingle />
        <Box sx={{ mt: 1, typography: 'caption', color: 'text.secondary' }}>
          © Thailand Cultural Hub. All rights reserved.
        </Box>
      </Box>
    </Box>
  );
}
