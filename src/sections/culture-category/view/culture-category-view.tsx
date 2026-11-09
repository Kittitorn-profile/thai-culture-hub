'use client';

import type { CulturalPlace } from 'src/sections/province/province-data';
import type { PlaceLikeState } from 'src/sections/province/view/province-place-card';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';

import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import provinces from 'src/data/thailand-culture/provinces';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';

import { getCreatorProfile } from 'src/sections/creator/creator-api';
import { getPlaceImages } from 'src/sections/province/view/province-detail-utils';
import { ProvincePlaceCard } from 'src/sections/province/view/province-place-card';
import { ProvincePlaceDialog } from 'src/sections/province/view/province-place-dialog';
import {
  getCategoryColor,
  getCategoryLabel,
  useCategoryConfig,
} from 'src/sections/province/category-config';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser } from 'src/auth/utils/role-redirect';

type CategoryPlace = CulturalPlace & {
  provinceCode: string;
  provinceName: string;
};

type CategoryResponse = {
  data?: CategoryPlace[];
  hasMore?: boolean;
  nextOffset?: number;
  total?: number;
  message?: string;
  category?: {
    key: string;
    label: string;
  };
};

type Props = {
  allCategories?: boolean;
};

type PlaceLikesResponse = {
  data?: Record<string, PlaceLikeState>;
};

type PlaceLikeResponse = {
  data?: {
    placeId: string;
    liked: boolean;
    likeCount: number;
  };
};

const PAGE_TEXT = '#202124';
const PAGE_BG_MIDDLE = '#f7f7f5';
const PAGE_BACKGROUND = 'none';
const PAGE_POSTER_PATTERN = 'none';
const SECTION_PX = { xs: 2.5, sm: 4, md: 6, lg: 8 };
const SECTION_MAX_WIDTH = 1280;
const LIKE_BATCH_SIZE = 80;
const PLACES_PAGE_SIZE = 16;

export function CultureCategoryView({ allCategories = false }: Props) {
  const { user } = useAuthContext();
  const categoryConfig = useCategoryConfig();
  const params = useParams<{ categoryKey: string }>();
  const categoryKey = allCategories ? '' : params.categoryKey;
  const categoryLabel = allCategories
    ? 'ข้อมูลวัฒนธรรมทั้งหมด'
    : getCategoryLabel(categoryConfig, categoryKey);
  const categoryColor = getCategoryColor(categoryConfig, categoryKey);
  const defaultProvinceCode = allCategories ? (provinces[0]?.code ?? '') : '';
  const [places, setPlaces] = useState<CategoryPlace[]>([]);
  const [provinceCode, setProvinceCode] = useState(defaultProvinceCode);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [placeLikes, setPlaceLikes] = useState<Record<string, PlaceLikeState>>({});
  const [totalPlaces, setTotalPlaces] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<CategoryPlace | null>(null);
  const [isCreatorProvinceChecked, setIsCreatorProvinceChecked] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const isCreatorProvinceAppliedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const isCreator = isCreatorUser(user);
  const shouldLoadCreatorProvince = allCategories && isCreator && Boolean(accessToken);

  const provinceOptions = useMemo(() => [{ code: '', name: 'ทุกจังหวัด' }, ...provinces], []);
  const selectedProvinceName = provinceCode
    ? provinces.find((province) => province.code === provinceCode)?.name
    : '';
  const pageDescription = selectedProvinceName
    ? allCategories
      ? `ค้นหาสถานที่ท่องเที่ยวทางวัฒนธรรม ประเพณี วัด พิพิธภัณฑ์ อาหารพื้นถิ่น ศิลปะ และภูมิปัญญาท้องถิ่นในจังหวัด${selectedProvinceName} พร้อมข้อมูลและรูปภาพที่อัปเดตล่าสุด`
      : `ค้นหาข้อมูล${categoryLabel}ในจังหวัด${selectedProvinceName} พร้อมรายละเอียด แผนที่ รูปภาพ และข้อมูลที่น่าเชื่อถือ`
    : allCategories
      ? 'Thailand Cultural Hub รวมข้อมูลวัฒนธรรมไทยจากทุกจังหวัด ทั้งสถานที่ท่องเที่ยว ประเพณี เทศกาล อาหาร ศิลปะ การแสดง และภูมิปัญญาท้องถิ่น'
      : `รวมข้อมูล${categoryLabel}จากทั่วประเทศไทย พร้อมรายละเอียด รูปภาพ แผนที่ และข้อมูลวัฒนธรรมที่น่าเชื่อถือ`;
  const selectedPlaceIndex = selectedPlace
    ? places.findIndex((place) => place.id === selectedPlace.id)
    : -1;
  const selectedPlaceImages = selectedPlace
    ? getPlaceImages(selectedPlace, selectedPlaceIndex)
    : [];
  const selectedPlaceCoordinates = selectedPlace
    ? `${selectedPlace.lat}, ${selectedPlace.lng}`
    : '';

  const loadPlaces = useCallback(
    async (options?: { append?: boolean; offset?: number }) => {
      const append = options?.append === true;
      const offset = append ? (options.offset ?? 0) : 0;
      const requestId = append ? loadRequestIdRef.current : loadRequestIdRef.current + 1;

      if (!append) {
        loadRequestIdRef.current = requestId;
      }

      if (append) {
        if (isLoadingMoreRef.current) {
          return;
        }

        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
      } else {
        setPlaces([]);
        setTotalPlaces(0);
        setNextOffset(0);
        setHasMore(false);
        setIsLoading(true);
      }
      setError('');

      try {
        const paramsValue = new URLSearchParams();

        paramsValue.set('limit', `${PLACES_PAGE_SIZE}`);
        paramsValue.set('offset', `${offset}`);

        if (categoryKey) {
          paramsValue.set('categoryKey', categoryKey);
        }

        if (provinceCode) {
          paramsValue.set('provinceCode', provinceCode);
        }

        if (appliedQuery) {
          paramsValue.set('q', appliedQuery);
        }

        const response = await fetch(`/api/culture/category?${paramsValue.toString()}`);
        const json = (await response.json()) as CategoryResponse;

        if (!response.ok) {
          throw new Error(json.message ?? 'โหลดข้อมูลหมวดไม่สำเร็จ');
        }

        if (requestId !== loadRequestIdRef.current) {
          return;
        }

        const nextPlaces = Array.isArray(json.data) ? json.data : [];

        setPlaces((currentPlaces) => (append ? [...currentPlaces, ...nextPlaces] : nextPlaces));
        setTotalPlaces(typeof json.total === 'number' ? json.total : nextPlaces.length);
        setNextOffset(
          typeof json.nextOffset === 'number' ? json.nextOffset : offset + nextPlaces.length
        );
        setHasMore(Boolean(json.hasMore));
      } catch (caughtError) {
        if (requestId === loadRequestIdRef.current) {
          if (!append) {
            setPlaces([]);
            setTotalPlaces(0);
            setNextOffset(0);
            setHasMore(false);
          }
          setError(caughtError instanceof Error ? caughtError.message : 'โหลดข้อมูลหมวดไม่สำเร็จ');
        }
      } finally {
        if (requestId === loadRequestIdRef.current) {
          if (append) {
            isLoadingMoreRef.current = false;
            setIsLoadingMore(false);
          } else {
            setIsLoading(false);
          }
        }
      }
    },
    [appliedQuery, categoryKey, provinceCode]
  );

  useEffect(() => {
    if (shouldLoadCreatorProvince && !isCreatorProvinceChecked) {
      return;
    }

    loadPlaces();
  }, [isCreatorProvinceChecked, loadPlaces, shouldLoadCreatorProvince]);

  useEffect(() => {
    if (!shouldLoadCreatorProvince) {
      setIsCreatorProvinceChecked(false);
      return;
    }

    if (isCreatorProvinceAppliedRef.current) {
      setIsCreatorProvinceChecked(true);
      return;
    }

    isCreatorProvinceAppliedRef.current = true;

    getCreatorProfile(accessToken)
      .then((result) => {
        if (result.data.provinceCode) {
          setProvinceCode(result.data.provinceCode);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsCreatorProvinceChecked(true);
      });
  }, [shouldLoadCreatorProvince, accessToken]);

  const handleSearch = () => {
    setAppliedQuery(query.trim());
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      loadPlaces({ append: true, offset: nextOffset });
    }
  }, [hasMore, isLoading, isLoadingMore, loadPlaces, nextOffset]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        rootMargin: '360px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, places.length]);

  const handlePlaceLike = useCallback(
    async (place: CulturalPlace) => {
      const previousState = placeLikes[place.id] ?? { liked: false, likeCount: 0 };
      const nextLiked = !previousState.liked;

      setPlaceLikes((currentLikes) => ({
        ...currentLikes,
        [place.id]: {
          liked: nextLiked,
          likeCount: Math.max(0, previousState.likeCount + (nextLiked ? 1 : -1)),
          loading: true,
        },
      }));

      try {
        const response = await fetch('/api/culture/place-likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId: place.id }),
        });
        const result = (await response.json().catch(() => ({}))) as PlaceLikeResponse;

        if (!response.ok || !result.data) {
          throw new Error('Unable to update place like');
        }

        setPlaceLikes((currentLikes) => ({
          ...currentLikes,
          [place.id]: {
            liked: result.data?.liked ?? nextLiked,
            likeCount: result.data?.likeCount ?? previousState.likeCount,
            loading: false,
          },
        }));
      } catch {
        setPlaceLikes((currentLikes) => ({
          ...currentLikes,
          [place.id]: {
            ...previousState,
            loading: false,
          },
        }));
      }
    },
    [placeLikes]
  );

  useEffect(() => {
    if (!places.length) {
      return undefined;
    }

    const controller = new AbortController();
    const placeIds = places.map((place) => place.id);

    async function loadLikes() {
      for (let index = 0; index < placeIds.length; index += LIKE_BATCH_SIZE) {
        const batchIds = placeIds
          .slice(index, index + LIKE_BATCH_SIZE)
          .map((placeId) => encodeURIComponent(placeId))
          .join(',');
        const response = await fetch(`/api/culture/place-likes?placeIds=${batchIds}`, {
          signal: controller.signal,
        });
        const result = (await response.json().catch(() => ({}))) as PlaceLikesResponse;

        if (response.ok && result.data) {
          setPlaceLikes((currentLikes) => ({
            ...currentLikes,
            ...result.data,
          }));
        }
      }
    }

    loadLikes().catch(() => {});

    return () => {
      controller.abort();
    };
  }, [places]);

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        overflow: 'hidden',
        position: 'relative',
        color: PAGE_TEXT,
        bgcolor: PAGE_BG_MIDDLE,
        backgroundImage: PAGE_BACKGROUND,
        px: SECTION_PX,
        pt: { xs: 3, md: 4 },
        pb: { xs: 5, md: 7 },
        fontFamily: "'LINE Seed Sans TH', sans-serif",
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: PAGE_POSTER_PATTERN,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Stack
        spacing={3}
        sx={{
          mx: 'auto',
          zIndex: 1,
          maxWidth: SECTION_MAX_WIDTH,
          position: 'relative',
        }}
      >
        <Stack spacing={2.5}>
          <Button
            component={RouterLink}
            href="/"
            color="inherit"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{ alignSelf: 'flex-start' }}
          >
            กลับหน้าแรก
          </Button>

          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#79613b', mb: 1 }}>
              สำรวจวัฒนธรรมไทย
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {!allCategories && (
                <Box
                  sx={{
                    width: 6,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: categoryColor,
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: 28, md: 38 },
                  fontWeight: 600,
                  color: PAGE_TEXT,
                  lineHeight: 1.4,
                }}
              >
                {categoryLabel}
              </Typography>
            </Stack>
            <Typography
              sx={{ mt: 1, fontSize: 14, lineHeight: 1.8, color: 'text.secondary', maxWidth: 760 }}
            >
              {pageDescription}
            </Typography>
          </Box>
        </Stack>

        <Card
          sx={{
            p: { xs: 1.5, md: 2 },
            borderRadius: 2,
            bgcolor: '#fff',
            border: '1px solid #e2e5de',
            boxShadow: 'none',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(0, 1fr) 240px auto' },
              gap: 1.25,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              sx={{
                gridColumn: { xs: '1 / -1', md: 'auto' },
                '& .MuiOutlinedInput-root': { minHeight: 44 },
              }}
              label="ค้นหาชื่อสถานที่ อำเภอ หรือจังหวัด"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" width={18} />
                    </InputAdornment>
                  ),
                },
              }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <Autocomplete
              fullWidth
              size="small"
              options={provinceOptions}
              value={
                provinceOptions.find((province) => province.code === provinceCode) ??
                provinceOptions[0]
              }
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              onChange={(_event, value) => setProvinceCode(value?.code ?? '')}
              sx={{ minWidth: 0, '& .MuiOutlinedInput-root': { minHeight: 44 } }}
              renderInput={(inputParams) => (
                <TextField
                  {...inputParams}
                  label="จังหวัด"
                  placeholder="เลือกหรือพิมพ์ชื่อจังหวัด"
                />
              )}
            />
            <LoadingButton
              variant="contained"
              loading={isLoading}
              onClick={handleSearch}
              sx={{
                minWidth: 88,
                minHeight: 44,
                bgcolor: '#293c34',
                color: '#fff',
                '&:hover': { bgcolor: '#3c5147' },
              }}
            >
              ค้นหา
            </LoadingButton>
          </Box>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            แสดง {places.length.toLocaleString('th-TH')} จาก {totalPlaces.toLocaleString('th-TH')}{' '}
            รายการ
          </Typography>
        </Stack>

        {isLoading && !places.length && (
          <Stack
            sx={{
              p: 5,
              textAlign: 'center',
              borderRadius: 1,
              height: 300,
              alignSelf: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontWeight: 600 }}>กำลังโหลดข้อมูล...</Typography>
          </Stack>
        )}

        {!isLoading && !error && !places.length && (
          <Box sx={{ py: 7, textAlign: 'center', border: '1px dashed #dfe3df', borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 600 }}>ไม่พบข้อมูลที่ค้นหา</Typography>
            <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
              ลองเปลี่ยนคำค้นหาหรือเลือกจังหวัดอื่น
            </Typography>
          </Box>
        )}
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          {places.map((place) => (
            <Stack key={place.id} spacing={1}>
              <ProvincePlaceCard
                place={place}
                likeState={placeLikes[place.id]}
                categoryConfig={categoryConfig}
                onPlaceLike={handlePlaceLike}
                onPlaceSelect={() => setSelectedPlace(place)}
              />
            </Stack>
          ))}
        </Box>

        {!!places.length && hasMore && (
          <Stack ref={loadMoreRef} spacing={1.25} alignItems="center" sx={{ py: 1 }}>
            <Typography sx={{ color: 'rgba(32,33,36,0.68)', fontSize: 13 }}>
              {isLoadingMore ? 'กำลังโหลดเพิ่มเติม...' : 'เลื่อนลงเพื่อโหลดเพิ่มเติม'}
            </Typography>
          </Stack>
        )}

        {!isLoading && !places.length && !error && (
          <Stack
            sx={{
              p: 5,
              textAlign: 'center',
              borderRadius: 1,
              height: 300,
              alignSelf: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontWeight: 600 }}>
              {allCategories ? 'ยังไม่พบข้อมูลวัฒนธรรม' : 'ยังไม่พบข้อมูลในหมวดนี้'}
            </Typography>
            <Typography sx={{ mt: 1 }}>ลองเลือกทุกจังหวัด หรือล้างคำค้นหาแล้วค้นหาใหม่</Typography>
          </Stack>
        )}
      </Stack>

      <ProvincePlaceDialog
        place={selectedPlace}
        placeIndex={selectedPlaceIndex}
        placeImages={selectedPlaceImages}
        provinceDisplayName={selectedPlace?.provinceName ?? ''}
        coordinates={selectedPlaceCoordinates}
        categoryConfig={categoryConfig}
        likeState={selectedPlace ? placeLikes[selectedPlace.id] : undefined}
        onPlaceLike={handlePlaceLike}
        onClose={() => setSelectedPlace(null)}
      />

      <Container sx={{ textAlign: 'center', mt: 4 }}>
        <Logo sx={{ width: 200, height: '100%' }} />
        <Box sx={{ mt: 1, typography: 'caption', color: 'text.secondary' }}>
          © Thailand Cultural Hub. All rights reserved.
        </Box>
      </Container>
    </Box>
  );
}
