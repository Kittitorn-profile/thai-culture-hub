'use client';

import type { Feature, Geometry, GeoJsonProperties, FeatureCollection } from 'geojson';

import { geoPath, geoMercator } from 'd3-geo';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

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
  provinceFill: string;
};

type MapStatusColors = {
  approved: string[];
  rejected: string[];
  noScore: string[];
};

const EMPTY_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
} satisfies FeatureCollection;

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

function getProvinceColor(province: ThailandProvince, mapStatusColors: MapStatusColors) {
  const source = province.iso ?? province.name;
  const hash = source.split('').reduce((total, char) => total + char.charCodeAt(0), 0);

  if (
    ['TH-80', 'TH-81', 'TH-82', 'TH-83', 'TH-84', 'TH-85', 'TH-86', 'TH-90', 'TH-91'].includes(
      source
    )
  ) {
    return mapStatusColors.rejected[hash % mapStatusColors.rejected.length];
  }

  if (hash % 13 === 0) {
    return mapStatusColors.rejected[hash % mapStatusColors.rejected.length];
  }

  if (hash % 11 === 0) {
    return mapStatusColors.noScore[0];
  }

  return mapStatusColors.approved[hash % mapStatusColors.approved.length];
}

export default function ThailandMap() {
  const theme = useTheme();
  const router = useRouter();
  const mapStatusColors = useMemo(
    () => ({
      approved: ['#d98b35', '#c96f2d', '#e6b65a', '#a9a857', '#d4a257'],
      rejected: ['#b45f3a', '#cc7d42', '#efc072'],
      noScore: ['#ead49a'],
    }),
    []
  );
  const { data: mapGeoJson = EMPTY_GEOJSON } = useThailandProvincesGeoJson({
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
  const mapItems = useMemo(() => {
    const mapFeatures = Array.isArray(mapGeoJson.features) ? mapGeoJson.features : [];

    return mapFeatures.reduce<ThailandProvinceMapItem[]>((items, geo, index) => {
      const pathData = geoPathGenerator(geo);

      if (!pathData) {
        return items;
      }

      const province = getProvinceFromGeography(geo);

      items.push({
        pathData,
        province,
        provinceFill: getProvinceColor(province, mapStatusColors),
        id: String(geo.id ?? geo.properties?.shapeID ?? province.iso ?? index),
      });

      return items;
    }, []);
  }, [geoPathGenerator, mapGeoJson.features, mapStatusColors]);
  const handleToggleProvincePopover = useCallback(
    (event: React.SyntheticEvent<SVGPathElement>, province: ThailandProvince) => {
      const anchor = event.currentTarget;

      setPopoverAnchor((currentAnchor) => {
        if (currentAnchor === anchor) {
          setPopoverProvince(null);
          return null;
        }

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

    const provinceId = popoverProvince.iso ?? popoverProvince.id;

    if (provinceId) {
      handleCloseProvincePopover();
      router.push(paths.province.details(provinceId, popoverProvince.name));
    }
  }, [handleCloseProvincePopover, popoverProvince, router]);

  const provincePathElements = useMemo(
    () =>
      mapItems.map(({ id, pathData, province, provinceFill }) => {
        const query = searchQuery.trim().toLowerCase();
        const isMatched =
          !!query && `${province.name} ${province.iso ?? ''}`.toLowerCase().includes(query);
        const isSelected =
          !!popoverProvince &&
          (popoverProvince.iso ?? popoverProvince.id) === (province.iso ?? province.id);
        const matchedFill = theme.palette.primary.light;
        const selectedFill = '#f5d266';

        return (
          <path
            key={id}
            d={pathData}
            role="button"
            aria-label={`Select ${province.name}`}
            tabIndex={0}
            fill={isSelected ? selectedFill : isMatched ? matchedFill : provinceFill}
            stroke={isSelected ? '#7b4b24' : alpha('#6d4b2c', 0.42)}
            strokeWidth={isSelected ? 1.8 : 0.9}
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
            <title>{province.name}</title>
          </path>
        );
      }),
    [
      handleToggleProvincePopover,
      mapItems,
      popoverProvince,
      searchQuery,
      theme.palette.primary.light,
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
          top: { xs: 18, md: 32 },
          left: 0,
          zIndex: 3,
          maxWidth: { xs: 190, sm: 360 },
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
      </Box>

      <Box
        sx={{
          top: { xs: 116, sm: 24, md: 32 },
          right: 0,
          zIndex: 3,
          width: { xs: 220, sm: 270 },
          height: 44,
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
          placeholder="ค้นหาจังหวัด / ประเพณี"
          onChange={(event) => setSearchQuery(event.target.value)}
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
            mx: 'auto',
            width: { xs: '150vw', sm: 1 },
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
              fill="#7b6032"
              filter="url(#paper-noise)"
              opacity="0.22"
            />
            <path
              d="M 622 22 C 592 92 642 128 603 202 C 565 276 624 332 582 416 C 548 485 583 548 548 626"
              fill="none"
              stroke="#75a9ad"
              strokeWidth={14}
              strokeLinecap="round"
              opacity={0.38}
            />
            <path
              d="M 108 78 C 184 126 156 172 224 213 C 310 265 277 332 356 388 C 441 449 410 524 494 600 C 548 650 609 650 676 704"
              fill="none"
              stroke="#2b8bad"
              strokeWidth={3}
              strokeDasharray="10 12"
              strokeLinecap="round"
              opacity={0.64}
            />
            <path
              d="M 818 92 C 754 142 804 216 738 268 C 670 322 726 414 642 474"
              fill="none"
              stroke="#b05b37"
              strokeWidth={3}
              strokeDasharray="8 12"
              strokeLinecap="round"
              opacity={0.42}
            />
            <text
              x="735"
              y="176"
              fill="#2b8bad"
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
              fill="#2b8bad"
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
              mt: 1.6,
              width: 280,
              p: 1.2,
              borderRadius: 3,
              overflow: 'visible',
              bgcolor: alpha(theme.palette.common.white, 0.94),
              boxShadow: `0 24px 70px ${alpha(theme.palette.grey[900], 0.22)}`,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -9,
                left: '50%',
                width: 18,
                height: 18,
                bgcolor: alpha(theme.palette.common.white, 0.94),
                transform: 'translateX(-50%) rotate(45deg)',
                borderRadius: 0.4,
              },
            },
          },
        }}
      >
        {popoverProvince && (
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                p: 1.2,
                display: 'flex',
                gap: 1.2,
                alignItems: 'center',
                borderRadius: 2,
                bgcolor: alpha('#ead49a', 0.34),
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: 'grid',
                  flexShrink: 0,
                  borderRadius: '50%',
                  placeItems: 'center',
                  color: '#7b3d27',
                  bgcolor: '#f5d266',
                  border: '2px solid #7b4b24',
                }}
              >
                <Iconify icon="custom:location-fill" width={19} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: '#1b2b2a', fontSize: 17, fontWeight: 900 }}>
                  {popoverProvince.name}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700 }}>
                  {popoverProvince.iso ?? popoverProvince.id ?? 'Thailand Cultural'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ px: 1.2, py: 1.4 }}>
              {['สถานที่สำคัญ', 'วัฒนธรรมท้องถิ่น', 'พิกัดและเรื่องเล่า'].map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.45 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#d98b35' }} />
                  <Typography sx={{ color: '#233331', fontSize: 13, fontWeight: 800 }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              component="button"
              type="button"
              onClick={handleViewProvinceDetails}
              sx={{
                width: 1,
                m: 0,
                px: 1.6,
                py: 1.15,
                border: 0,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                fontWeight: 900,
                borderRadius: 2,
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#d98b35',
                boxShadow: `0 12px 28px ${alpha('#d98b35', 0.28)}`,
              }}
            >
              ดูรายละเอียด
              <Box
                component="span"
                sx={{
                  width: 26,
                  height: 26,
                  display: 'grid',
                  color: '#d98b35',
                  borderRadius: '50%',
                  bgcolor: 'white',
                  placeItems: 'center',
                }}
              >
                <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
              </Box>
            </Box>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
