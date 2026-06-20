'use client';

import type { SyntheticEvent } from 'react';
import type { CulturalPlace, CulturalCategory } from '../province-data';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { TruncatedTypography } from 'src/components/typography';

import { getSourceLabel } from './province-detail-utils';
import { CULTURE_CATEGORY_LABELS, CULTURE_CATEGORY_COLORS } from '../province-data';

type ProvincePlacesDrawerProps = {
  open: boolean;
  selectedDistrictDetail: string | null;
  places: CulturalPlace[];
  allPlacesCount: number;
  culturalPlaces: CulturalPlace[];
  onClose: () => void;
  onPlaceSelect: (place: CulturalPlace) => void;
};

const CATEGORY_TAB_ALL = 'all';

function getCoordinatesText(place: CulturalPlace) {
  const placeLat = Number(place.lat);
  const placeLng = Number(place.lng);

  return Number.isFinite(placeLat) && Number.isFinite(placeLng)
    ? `${placeLat}, ${placeLng}`
    : 'ไม่พบพิกัด';
}

function getGoogleMapsUrl(place: CulturalPlace) {
  if (place.mapUrl) {
    return place.mapUrl;
  }

  const placeLat = Number(place.lat);
  const placeLng = Number(place.lng);

  return Number.isFinite(placeLat) && Number.isFinite(placeLng)
    ? `https://www.google.com/maps/search/?api=1&query=${placeLat},${placeLng}`
    : null;
}

function ProvincePlaceCard({
  place,
  placeIndex,
  onPlaceSelect,
}: {
  place: CulturalPlace;
  placeIndex: number;
  onPlaceSelect: (place: CulturalPlace) => void;
}) {
  const theme = useTheme();
  const accentColor = CULTURE_CATEGORY_COLORS[place.category];
  const cardImage = place.imageUrls?.[0];
  const googleMapsUrl = getGoogleMapsUrl(place);

  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fff',
        border: `1px solid ${alpha(accentColor, 0.16)}`,
        boxShadow: `0 14px 30px ${alpha(theme.palette.grey[900], 0.1)}`,
      }}
    >
      <Box
        sx={{
          height: 190,
          borderRadius: 1.5,
          overflow: 'hidden',
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          bgcolor: cardImage ? alpha(accentColor, 0.16) : theme.palette.grey[300],
          backgroundImage: cardImage
            ? `linear-gradient(180deg, ${alpha(
                theme.palette.common.black,
                0.02
              )} 0%, ${alpha(theme.palette.common.black, 0.2)} 100%), url(${cardImage})`
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!cardImage && (
          <Box
            component="img"
            alt="Thailand Cultural Hub"
            src="/assets/th-hub/logo-th-hub.png"
            sx={{
              width: 92,
              maxWidth: '46%',
              opacity: 0.58,
              filter: 'grayscale(1)',
            }}
          />
        )}

        <Box
          sx={{
            top: 0,
            left: '50%',
            px: 2.2,
            py: 0.7,
            color: accentColor,
            fontSize: 12,
            fontWeight: 900,
            borderRadius: '0 0 10px 10px',
            position: 'absolute',
            transform: 'translateX(-50%)',
            bgcolor: '#ffffff',
            boxShadow: `0 8px 18px ${alpha(theme.palette.grey[900], 0.12)}`,
            whiteSpace: 'nowrap',
          }}
        >
          {CULTURE_CATEGORY_LABELS[place.category]}
        </Box>

        <Chip
          size="small"
          label={place.district}
          sx={{
            left: 12,
            bottom: 12,
            color: 'white',
            fontWeight: 900,
            position: 'absolute',
            bgcolor: alpha(theme.palette.grey[900], 0.72),
          }}
        />
        <Box
          sx={{
            top: 12,
            left: 12,
            width: 34,
            height: 34,
            color: 'white',
            display: 'grid',
            fontWeight: 900,
            borderRadius: '50%',
            position: 'absolute',
            placeItems: 'center',
            bgcolor: accentColor,
            border: '2px solid #fff7df',
            boxShadow: `0 8px 18px ${alpha(theme.palette.grey[900], 0.22)}`,
          }}
        >
          {placeIndex + 1}
        </Box>
      </Box>

      <Box sx={{ px: 0.6, pt: 1.4, pb: 0.4 }}>
        <Typography sx={{ color: accentColor, fontWeight: 900, fontSize: 14 }}>
          {place.highlight}
        </Typography>
        <Typography
          sx={{
            mt: 0.8,
            color: theme.palette.grey[900],
            fontSize: 18,
            fontWeight: 900,
            lineHeight: 1.1,
          }}
        >
          {place.name}
        </Typography>
        <TruncatedTypography
          line={2}
          sx={{ mt: 1, color: 'text.secondary', fontSize: 13, lineHeight: 1.55 }}
        >
          {place.description}
        </TruncatedTypography>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mt: 1.6 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: accentColor, fontSize: 12, fontWeight: 900 }}>
              {getSourceLabel(place.source)}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 800 }}>
              {getCoordinatesText(place)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.8} sx={{ flexShrink: 0 }}>
            {googleMapsUrl && (
              <Button
                component="a"
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<Iconify icon="custom:location-fill" />}
                sx={{
                  m: 0,
                  px: 1.4,
                  py: 1,
                  border: 0,
                  color: accentColor,
                  cursor: 'pointer',
                  fontWeight: 900,
                  borderRadius: 1.2,
                  bgcolor: alpha(accentColor, 0.1),
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                }}
              >
                Google Map
              </Button>
            )}

            <Button
              onClick={() => onPlaceSelect(place)}
              sx={{
                m: 0,
                px: 2,
                py: 1,
                border: 0,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 900,
                borderRadius: 1.2,
                bgcolor: '#f48b2a',
                whiteSpace: 'nowrap',
                boxShadow: `0 10px 22px ${alpha('#f48b2a', 0.26)}`,
              }}
            >
              ดูรายละเอียด
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

export function ProvincePlacesDrawer({
  open,
  selectedDistrictDetail,
  places,
  allPlacesCount,
  culturalPlaces,
  onClose,
  onPlaceSelect,
}: ProvincePlacesDrawerProps) {
  const theme = useTheme();
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>(CATEGORY_TAB_ALL);
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

  const handleCategoryTabChange = (_event: SyntheticEvent, value: string) => {
    setSelectedCategoryTab(value);
  };

  useEffect(() => {
    if (
      selectedCategoryTab !== CATEGORY_TAB_ALL &&
      !drawerCategoryOptions.includes(selectedCategoryTab as CulturalCategory)
    ) {
      setSelectedCategoryTab(CATEGORY_TAB_ALL);
    }
  }, [drawerCategoryOptions, selectedCategoryTab]);

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
            label={CULTURE_CATEGORY_LABELS[category]}
            sx={{
              color: CULTURE_CATEGORY_COLORS[category],
              '&.Mui-selected': { color: CULTURE_CATEGORY_COLORS[category] },
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
              placeIndex={culturalPlaces.findIndex((item) => item.id === place.id)}
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
