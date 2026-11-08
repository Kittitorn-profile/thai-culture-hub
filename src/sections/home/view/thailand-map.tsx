'use client';

import type { CategoryConfigMap } from 'src/sections/province/category-config';

import { useQuery } from '@tanstack/react-query';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Popper from '@mui/material/Popper';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { Box, CircularProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import provinces from 'src/data/thailand-culture/provinces';

import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import {
  getCategoryLabel,
  getCategoryColor,
  useCategoryConfigQuery,
} from 'src/sections/province/category-config';

// ----------------------------------------------------------------------

type ThailandProvince = {
  id?: string;
  name: string;
  iso?: string;
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
  total?: number;
};

type ProvinceCategorySummaryMap = Record<string, ProvinceCategorySummary>;

type ApiProvinceCategorySummary = {
  counts?: unknown;
  dominantCategory?: unknown;
  total?: unknown;
};

const EMPTY_CATEGORY_CONFIG: CategoryConfigMap = {};
const PENDING_PROVINCE_FILL = '#e4e8e3';
const EMPTY_MAP_ITEMS: Omit<ThailandProvinceMapItem, 'provinceFill'>[] = [];

const DEFAULT_PROVINCE_FILL = '#ffffff';
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

function isCategoryCounts(value: unknown): value is ProvinceCategoryCounts {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((count) => typeof count === 'number')
  );
}

function getProvinceCategorySummaryFromApi(
  summary: ApiProvinceCategorySummary,
  categoryConfig: CategoryConfigMap
): ProvinceCategorySummary | null {
  if (!isCategoryCounts(summary.counts)) {
    return null;
  }

  const dominantCategory =
    typeof summary.dominantCategory === 'string' && summary.dominantCategory
      ? summary.dominantCategory
      : getDominantCategoryFromCounts(summary.counts);

  if (!dominantCategory) {
    return null;
  }

  return {
    counts: summary.counts,
    dominantCategory,
    color: getCategoryColor(categoryConfig, dominantCategory),
    total: typeof summary.total === 'number' ? summary.total : undefined,
  };
}

function getProvinceColor(province: ThailandProvince, summaries: ProvinceCategorySummaryMap) {
  return summaries[getProvinceId(province)]?.color ?? DEFAULT_PROVINCE_FILL;
}

async function fetchHomeMapPaths(signal: AbortSignal) {
  const response = await fetch('/assets/maps/thailand-home-paths.json', { signal });
  if (!response.ok) throw new Error('Unable to load map paths');
  const items = await response.json();
  if (
    !Array.isArray(items) ||
    items.length !== 77 ||
    items.some((item) => !item.pathData || !item.province?.iso)
  )
    throw new Error('Invalid map paths');
  return items as Omit<ThailandProvinceMapItem, 'provinceFill'>[];
}

async function fetchProvinceCategorySummaries(signal: AbortSignal) {
  const response = await fetch('/api/culture/province-places/?summary=true&v=4', { signal });
  if (!response.ok) throw new Error('Unable to load province summaries');
  const result = await response.json();
  if (!result.summaries || typeof result.summaries !== 'object')
    throw new Error('Invalid province summaries');
  return result.summaries as Record<string, ApiProvinceCategorySummary>;
}

export default function ThailandMap() {
  const theme = useTheme();
  const router = useRouter();
  const {
    data: loadedCategoryConfig,
    isPending: isCategoryConfigLoading,
    isError: isCategoryConfigError,
    refetch: refetchCategoryConfig,
  } = useCategoryConfigQuery();
  const categoryConfig = loadedCategoryConfig ?? EMPTY_CATEGORY_CONFIG;
  const { data: baseMapItems = EMPTY_MAP_ITEMS, isLoading: isMapGeoJsonLoading } = useQuery({
    queryKey: ['thailand', 'home-map-paths', 'v1'],
    queryFn: ({ signal }) => fetchHomeMapPaths(signal),
    staleTime: Infinity,
    gcTime: 86_400_000,
    refetchOnWindowFocus: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverAnchor, setPopoverAnchor] = useState<SVGPathElement | null>(null);
  const [popoverProvince, setPopoverProvince] = useState<ThailandProvince | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPopoverTimers = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }, []);
  useEffect(() => () => cancelPopoverTimers(), [cancelPopoverTimers]);
  // Start summaries independently of the map file; never fan out to 77 place APIs.
  const {
    data: apiSummaries,
    isPending: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummaries,
  } = useQuery({
    queryKey: ['thailand', 'province-category-summaries', 'v4'],
    queryFn: ({ signal }) => fetchProvinceCategorySummaries(signal),
    staleTime: 300_000,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    gcTime: 86_400_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const provinceCategorySummaries = useMemo<ProvinceCategorySummaryMap>(() => {
    const summaries: ProvinceCategorySummaryMap = {};
    // Do not publish hash/default colors while the saved category palette is still loading.
    if (!apiSummaries || !loadedCategoryConfig) return summaries;
    Object.entries(apiSummaries).forEach(([id, value]) => {
      const summary = getProvinceCategorySummaryFromApi(value, categoryConfig);
      if (summary) summaries[id] = summary;
    });
    return summaries;
  }, [apiSummaries, categoryConfig, loadedCategoryConfig]);
  const mapItems = useMemo(
    () =>
      baseMapItems.map((item) => ({
        ...item,
        provinceFill:
          apiSummaries && loadedCategoryConfig
            ? getProvinceColor(item.province, provinceCategorySummaries)
            : PENDING_PROVINCE_FILL,
      })),
    [baseMapItems, provinceCategorySummaries, apiSummaries, loadedCategoryConfig]
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

  const isMapLoading = isMapGeoJsonLoading || isCategoryConfigLoading || isSummaryLoading;
  const hasMapContent = mapItems.length > 0;
  const showProvinceSearchResults = Boolean(normalizedSearchQuery);
  const popoverProvinceId = popoverProvince ? getProvinceId(popoverProvince) : '';
  const popoverProvinceDisplayName = popoverProvince ? getProvinceDisplayName(popoverProvince) : '';
  const popoverProvinceSummary = popoverProvinceId
    ? provinceCategorySummaries[popoverProvinceId]
    : undefined;

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

  const handleSelectMapProvince = useCallback(
    (_event: React.SyntheticEvent<SVGPathElement>, province: ThailandProvince) => {
      cancelPopoverTimers();
      const provinceId = getProvinceId(province);
      if (!provinceId) return;
      trackAnalyticsEvent('province_map_click', getProvinceDisplayName(province), {
        provinceId,
        provinceName: getProvinceDisplayName(province),
      });
      setPopoverAnchor(null);
      setPopoverProvince(null);
      router.push(paths.province.details(provinceId, getProvinceDisplayName(province)));
    },
    [cancelPopoverTimers, router]
  );

  const handleCloseProvincePopover = useCallback(() => {
    cancelPopoverTimers();
    setPopoverAnchor(null);
    setPopoverProvince(null);
  }, [cancelPopoverTimers]);

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
        const selectedFill = alpha(provinceFill, 0.75);

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
            onPointerEnter={(event) => {
              if (event.pointerType !== 'mouse') return;
              cancelPopoverTimers();
              const anchor = event.currentTarget;
              hoverTimer.current = setTimeout(() => {
                setPopoverAnchor(anchor);
                setPopoverProvince(province);
              }, 60);
            }}
            onPointerLeave={() => {
              if (hoverTimer.current) clearTimeout(hoverTimer.current);
              hoverTimer.current = null;
              handleCloseProvincePopover();
            }}
            onFocus={(event) => {
              cancelPopoverTimers();
              setPopoverAnchor(event.currentTarget);
              setPopoverProvince(province);
            }}
            onBlur={handleCloseProvincePopover}
            onClick={(event) => {
              handleSelectMapProvince(event, province);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSelectMapProvince(event, province);
              }
            }}
            style={{
              cursor: 'pointer',
              outline: 'none',
              transition: 'fill 140ms ease, opacity 140ms ease',
            }}
          />
        );
      }),
    [
      handleSelectMapProvince,
      handleCloseProvincePopover,
      cancelPopoverTimers,
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
            color: '#252b2e',
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
            color: '#626a6e',
            fontSize: { xs: 12, sm: 15 },
            fontWeight: 700,
            lineHeight: 1.45,
          }}
        >
          เลือกจังหวัดเพื่อดูสถานที่ ศิลปิน ชุมชน และข้อมูลวัฒนธรรมที่มีในพื้นที่
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
                stroke="#7c878b"
                strokeWidth={3}
                strokeDasharray="8 12"
                strokeLinecap="round"
                opacity={0.42}
              />
              <text
                x="735"
                y="176"
                fill="#68757a"
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
                fill="#68757a"
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

      {(isCategoryConfigError || isSummaryError) && (
        <Box
          role="alert"
          sx={{
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            color: 'text.secondary',
            fontSize: 13,
          }}
        >
          ยังโหลดข้อมูลสีแผนที่ไม่สำเร็จ
          <Button
            size="small"
            onClick={() => {
              void refetchCategoryConfig();
              void refetchSummaries();
            }}
          >
            ลองอีกครั้ง
          </Button>
        </Box>
      )}
      <Box
        component="section"
        aria-label="คำอธิบายสีแผนที่"
        sx={{ borderTop: '1px solid #dde1dd', pt: 3, pb: 2 }}
      >
        <Typography component="h3" sx={{ fontSize: 15, fontWeight: 600, color: '#252b2e' }}>
          สีบนแผนที่หมายถึงอะไร?
        </Typography>
        <Typography sx={{ mt: 0.75, mb: 2, fontSize: 13, color: '#626a6e', lineHeight: 1.7 }}>
          สีของแต่ละจังหวัดแสดงหมวดวัฒนธรรมที่มีจำนวนรายการมากที่สุดในข้อมูลของจังหวัดนั้น
        </Typography>
        <Box
          component="ul"
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            display: 'flex',
            flexWrap: 'wrap',
            columnGap: 3,
            rowGap: 1.5,
          }}
        >
          {Array.from(
            new Set([
              ...Object.values(provinceCategorySummaries).map(
                (summary) => summary.dominantCategory
              ),
              ...Object.keys(categoryConfig).filter((key) =>
                mapItems.some((item) => item.provinceFill === getCategoryColor(categoryConfig, key))
              ),
            ])
          )
            .sort((a, b) =>
              getCategoryLabel(categoryConfig, a).localeCompare(
                getCategoryLabel(categoryConfig, b),
                'th'
              )
            )
            .map((key) => (
              <Box
                component="li"
                key={key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: 13,
                  color: '#50595d',
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 0.5,
                    flexShrink: 0,
                    bgcolor: getCategoryColor(categoryConfig, key),
                    border: '1px solid #00000012',
                  }}
                />
                {getCategoryLabel(categoryConfig, key)}
              </Box>
            ))}
          {loadedCategoryConfig && apiSummaries && (
            <Box
              component="li"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13, color: '#50595d' }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 0.5,
                  bgcolor: DEFAULT_PROVINCE_FILL,
                  border: '1px solid #cbd1cd',
                }}
              />
              ยังไม่มีข้อมูลหมวดวัฒนธรรม
            </Box>
          )}
        </Box>
      </Box>

      <Popper
        open={Boolean(popoverAnchor && popoverProvince)}
        anchorEl={popoverAnchor}
        placement="top"
        modifiers={[{ name: 'offset', options: { offset: [0, 12] } }]}
        sx={{ zIndex: 1300, pointerEvents: 'none' }}
      >
        <Box
          sx={{
            maxWidth: 280,
            px: 2,
            py: 1.5,
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid #e7ebe4',
            boxShadow: '0 4px 18px rgba(30,45,35,0.12)',
          }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#293c34' }}>
            {popoverProvinceDisplayName}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 12, color: 'text.secondary' }}>
            {typeof popoverProvinceSummary?.total === 'number'
              ? `ข้อมูลวัฒนธรรมในจังหวัด ${popoverProvinceSummary.total.toLocaleString('th-TH')} รายการ`
              : 'สำรวจเรื่องราวและข้อมูลวัฒนธรรมในจังหวัด'}
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: 12, color: '#568080' }}>
            คลิกจังหวัดเพื่อดูข้อมูลและสำรวจพื้นที่
          </Typography>
        </Box>
      </Popper>
    </Box>
  );
}
