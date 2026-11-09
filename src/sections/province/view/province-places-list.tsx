'use client';

import type { SyntheticEvent } from 'react';
import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';
import type { PlaceLikeState } from './province-place-card';

import { RiSearchLine } from '@remixicon/react';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';

import { ProvincePlaceCard } from './province-place-card';
import { getCategoryColor, getCategoryLabel } from '../category-config';

type ProvincePlacesListProps = {
  selectedDistrictDetail: string | null;
  places: CulturalPlace[];
  categoryConfig: CategoryConfigMap;
  onPlaceSelect: (place: CulturalPlace) => void;
};

const CATEGORY_TAB_ALL = 'all';

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

export function ProvincePlacesList({
  selectedDistrictDetail,
  places,
  categoryConfig,
  onPlaceSelect,
}: ProvincePlacesListProps) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>(CATEGORY_TAB_ALL);
  const [placeLikes, setPlaceLikes] = useState<Record<string, PlaceLikeState>>({});
  const categoryOptions = useMemo(
    () => Array.from(new Set(places.map((place) => place.category))),
    [places]
  );

  const visiblePlaces = useMemo(
    () =>
      selectedCategoryTab === CATEGORY_TAB_ALL
        ? places
        : places.filter((place) => place.category === selectedCategoryTab),
    [places, selectedCategoryTab]
  );

  const searchedPlaces = useMemo(
    () =>
      visiblePlaces.filter(
        (place) =>
          !search.trim() ||
          [place.name, place.district, place.description]
            .join(' ')
            .toLocaleLowerCase('th')
            .includes(search.trim().toLocaleLowerCase('th'))
      ),
    [visiblePlaces, search]
  );
  const displayedPlaces = searchedPlaces.slice(0, visibleCount);

  const visiblePlaceIds = useMemo(
    () =>
      searchedPlaces
        .slice(0, visibleCount)
        .map((place) => place.id)
        .filter(Boolean),
    [searchedPlaces, visibleCount]
  );

  const handleCategoryTabChange = (_event: SyntheticEvent, value: string) => {
    setSelectedCategoryTab(value);
    setVisibleCount(12);
  };

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
    if (
      selectedCategoryTab !== CATEGORY_TAB_ALL &&
      !categoryOptions.includes(selectedCategoryTab)
    ) {
      setSelectedCategoryTab(CATEGORY_TAB_ALL);
    }
  }, [categoryOptions, selectedCategoryTab]);

  useEffect(() => {
    if (!visiblePlaceIds.length) {
      return undefined;
    }

    const controller = new AbortController();
    const placeIds = visiblePlaceIds.map((placeId) => encodeURIComponent(placeId)).join(',');

    fetch(`/api/culture/place-likes?placeIds=${placeIds}`, { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as PlaceLikesResponse;

        if (!response.ok || !result.data) {
          return;
        }

        setPlaceLikes((currentLikes) => ({
          ...currentLikes,
          ...result.data,
        }));
      })
      .catch(() => {});

    return () => {
      controller.abort();
    };
  }, [visiblePlaceIds]);

  const content = (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        gap={2.5}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{ fontSize: { xs: 24, md: 36 }, fontWeight: 700, overflowWrap: 'anywhere' }}
          >
            {selectedDistrictDetail ?? 'สถานที่และวัฒนธรรม'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            {places.length} สถานที่และข้อมูลวัฒนธรรม
          </Typography>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="ค้นหาชื่อสถานที่หรือคำที่สนใจ"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <RiSearchLine size={18} />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'ค้นหาสถานที่' },
          }}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setVisibleCount(12);
          }}
          sx={{
            width: { xs: 1, sm: 280, md: 340 },
            maxWidth: '100%',
            flexShrink: 0,
            '& .MuiOutlinedInput-root': { borderRadius: 99, bgcolor: 'background.paper' },
          }}
        />
      </Stack>

      <Divider sx={{ my: 2.2 }} />

      <Tabs
        aria-label="เลือกหมวดสถานที่"
        value={selectedCategoryTab}
        onChange={handleCategoryTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 2.5,
          minWidth: 0,
          maxWidth: '100%',
          minHeight: 44,
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTabs-list, & .MuiTabs-flexContainer': { gap: 1 },
          '& .MuiTabs-scrollButtons': {
            width: 30,
            borderRadius: 99,
            '&.Mui-disabled': { display: 'none' },
          },
          '& .MuiTab-root': {
            minHeight: 44,
            minWidth: 'auto',
            px: 2,
            py: 0.75,
            borderRadius: 99,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'text.secondary',
            fontSize: 13,
            fontWeight: 500,
            transition: 'background-color 150ms, border-color 150ms, color 150ms',
            '&:hover': { bgcolor: '#edf1e9', borderColor: '#a5b4a0' },
            '&.Mui-selected': {
              bgcolor: '#293c34',
              color: '#fff',
              borderColor: '#293c34',
              fontWeight: 600,
            },
            '&:focus-visible': { outline: '2px solid #839b7c', outlineOffset: 2 },
          },
        }}
      >
        <Tab value={CATEGORY_TAB_ALL} label="ทั้งหมด" />
        {categoryOptions.map((category) => (
          <Tab
            key={category}
            value={category}
            label={
              <Box
                component="span"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
              >
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: getCategoryColor(categoryConfig, category),
                    flexShrink: 0,
                  }}
                />
                {getCategoryLabel(categoryConfig, category)}
              </Box>
            }
          />
        ))}
      </Tabs>

      <Typography sx={{ mb: 2, color: 'text.secondary', fontSize: 13 }}>
        แสดง {Math.min(visibleCount, searchedPlaces.length)} จาก {searchedPlaces.length} รายการ
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, sm: 2.5 },
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {searchedPlaces.length ? (
          displayedPlaces.map((place) => (
            <ProvincePlaceCard
              key={place.id}
              place={place}
              likeState={placeLikes[place.id]}
              categoryConfig={categoryConfig}
              onPlaceLike={handlePlaceLike}
              onPlaceSelect={onPlaceSelect}
            />
          ))
        ) : (
          <Box
            sx={{
              p: 3,
              borderRadius: 1.5,
              textAlign: 'center',
              bgcolor: alpha(theme.palette.primary.lighter, 0.18),
              border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
            }}
          >
            <Typography sx={{ fontWeight: 600 }}>ยังไม่มีข้อมูลสถานที่ของจังหวัดนี้</Typography>
            <Typography sx={{ mt: 0.8, color: 'text.secondary', fontSize: 14 }}>
              ลองเปลี่ยนตัวกรอง หรือเลือกอำเภออื่นบนแผนที่
            </Typography>
          </Box>
        )}
      </Box>
      {visibleCount < searchedPlaces.length && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button variant="outlined" onClick={() => setVisibleCount((count) => count + 12)}>
            ดูเพิ่มอีก {Math.min(12, searchedPlaces.length - visibleCount)} รายการ
          </Button>
        </Box>
      )}
    </>
  );
  return <Box>{content}</Box>;
}
