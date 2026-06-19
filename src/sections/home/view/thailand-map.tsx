'use client';

import type { Feature, Geometry, GeoJsonProperties, FeatureCollection } from 'geojson';

import { useMemo, useState } from 'react';
import { geoPath, geoMercator } from 'd3-geo';

import Box from '@mui/material/Box';
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
      approved: [
        theme.palette.primary.darker,
        theme.palette.primary.dark,
        theme.palette.primary.main,
        theme.palette.primary.light,
        theme.palette.primary.lighter,
      ],
      rejected: [
        theme.palette.primary.dark,
        theme.palette.primary.main,
        theme.palette.primary.light,
      ],
      noScore: [theme.palette.primary.lighter],
    }),
    [
      theme.palette.primary.dark,
      theme.palette.primary.darker,
      theme.palette.primary.light,
      theme.palette.primary.lighter,
      theme.palette.primary.main,
    ]
  );
  const { data: mapGeoJson = EMPTY_GEOJSON } = useThailandProvincesGeoJson({
    select: rewindGeoJson,
  });
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSelectProvince = (province: ThailandProvince) => {
    const provinceId = province.iso ?? province.id;

    if (provinceId) {
      router.push(paths.province.details(provinceId, province.name));
    }
  };

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
            maxWidth: { xs: 'none', sm: 960 },
            height: { xs: 980, sm: 820, md: 960 },
            flexShrink: 0,
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
            {mapItems.map(({ id, pathData, province, provinceFill }) => {
              const query = searchQuery.trim().toLowerCase();
              const isMatched =
                !!query && `${province.name} ${province.iso ?? ''}`.toLowerCase().includes(query);
              const matchedFill = theme.palette.primary.light;

              return (
                <path
                  key={id}
                  d={pathData}
                  role="button"
                  aria-label={`Select ${province.name}`}
                  tabIndex={0}
                  fill={isMatched ? matchedFill : provinceFill}
                  stroke={alpha(theme.palette.common.white, 0.76)}
                  strokeWidth={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  onClick={() => {
                    handleSelectProvince(province);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelectProvince(province);
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'fill 140ms ease',
                  }}
                >
                  <title>{province.name}</title>
                </path>
              );
            })}
          </svg>
        </Box>
      </Box>
    </Box>
  );
}
