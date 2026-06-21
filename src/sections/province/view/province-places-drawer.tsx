'use client';

import type { SyntheticEvent } from 'react';
import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';
import type { PlaceLikeState } from './province-place-card';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { ProvincePlaceCard } from './province-place-card';
import { getCategoryColor, getCategoryLabel } from '../category-config';

type ProvincePlacesDrawerProps = {
  open: boolean;
  selectedDistrictDetail: string | null;
  places: CulturalPlace[];
  allPlacesCount: number;
  categoryConfig: CategoryConfigMap;
  onClose: () => void;
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

export function ProvincePlacesDrawer({
  open,
  selectedDistrictDetail,
  places,
  allPlacesCount,
  categoryConfig,
  onClose,
  onPlaceSelect,
}: ProvincePlacesDrawerProps) {
  const theme = useTheme();
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>(CATEGORY_TAB_ALL);
  const [placeLikes, setPlaceLikes] = useState<Record<string, PlaceLikeState>>({});
  const drawerCategoryOptions = useMemo(
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

  const visiblePlaceIds = useMemo(
    () => visiblePlaces.map((place) => place.id).filter(Boolean),
    [visiblePlaces]
  );

  const handleCategoryTabChange = (_event: SyntheticEvent, value: string) => {
    setSelectedCategoryTab(value);
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
      !drawerCategoryOptions.includes(selectedCategoryTab)
    ) {
      setSelectedCategoryTab(CATEGORY_TAB_ALL);
    }
  }, [drawerCategoryOptions, selectedCategoryTab]);

  useEffect(() => {
    if (!open || !visiblePlaceIds.length) {
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
  }, [open, visiblePlaceIds]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: 340, sm: 460 },
          p: 2.5,
          bgcolor: '#f8f8f2',
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900 }}>
            {selectedDistrictDetail ?? 'สถานที่และวัฒนธรรม'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            {selectedDistrictDetail
              ? `${visiblePlaces.length} รายการในอำเภอนี้`
              : `แสดง ${visiblePlaces.length} จาก ${allPlacesCount} รายการ`}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>

      <Divider sx={{ my: 2.2 }} />

      <Tabs
        value={selectedCategoryTab}
        onChange={handleCategoryTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mx: -0.5,
          mb: 2,
          minHeight: 40,
          '& .MuiTab-root': {
            minHeight: 40,
            px: 1.5,
            fontSize: 13,
            fontWeight: 900,
          },
        }}
      >
        <Tab value={CATEGORY_TAB_ALL} label="ทั้งหมด" />
        {drawerCategoryOptions.map((category) => (
          <Tab
            key={category}
            value={category}
            label={getCategoryLabel(categoryConfig, category)}
            sx={{
              color: getCategoryColor(categoryConfig, category),
              '&.Mui-selected': { color: getCategoryColor(categoryConfig, category) },
            }}
          />
        ))}
      </Tabs>

      <Stack spacing={2}>
        {visiblePlaces.length ? (
          visiblePlaces.map((place) => (
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
            <Typography sx={{ fontWeight: 900 }}>ยังไม่มีข้อมูลสถานที่ของจังหวัดนี้</Typography>
            <Typography sx={{ mt: 0.8, color: 'text.secondary', fontSize: 14 }}>
              ลองเปลี่ยนตัวกรอง หรือเลือกอำเภออื่นบนแผนที่
            </Typography>
          </Box>
        )}
      </Stack>
    </Drawer>
  );
}
