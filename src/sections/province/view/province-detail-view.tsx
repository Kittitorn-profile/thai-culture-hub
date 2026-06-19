'use client';

import type { Feature, Geometry, GeoJsonProperties } from 'geojson';

import { useMemo } from 'react';
import { geoPath, geoMercator } from 'd3-geo';
import { useParams, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { rewindGeometry, useThailandProvincesGeoJson } from '../thailand-geojson';
import {
  getCultureMetrics,
  getProvinceDisplayName,
  CULTURE_CATEGORY_LABELS,
  CULTURE_CATEGORY_COLORS,
  getProvinceCulturalPlaces,
} from '../province-data';

// ----------------------------------------------------------------------

type ProvinceFeature = Feature<Geometry, GeoJsonProperties>;

function getProvinceFeature(geoJson: any, provinceId: string) {
  const feature = geoJson.features.find(
    (item: ProvinceFeature) => item.properties?.shapeISO === provinceId
  );

  if (!feature) {
    return null;
  }

  return {
    ...feature,
    geometry: rewindGeometry(feature.geometry),
  } satisfies ProvinceFeature;
}

type LandmarkMarker = {
  id: string;
  name: string;
  district: string;
  category: keyof typeof CULTURE_CATEGORY_COLORS;
  x: number;
  y: number;
};

function ProvinceShapeMap({
  provinceId,
  provinceName,
}: {
  provinceId: string;
  provinceName: string;
}) {
  const theme = useTheme();
  const culturalPlaces = useMemo(
    () => getProvinceCulturalPlaces(provinceId, provinceName),
    [provinceId, provinceName]
  );
  const { data: provincesGeoJson } = useThailandProvincesGeoJson();
  const provinceFeatures = useMemo(
    () => (Array.isArray(provincesGeoJson?.features) ? provincesGeoJson.features : []),
    [provincesGeoJson]
  );
  const provinceFeature = useMemo(
    () => getProvinceFeature({ type: 'FeatureCollection', features: provinceFeatures }, provinceId),
    [provinceFeatures, provinceId]
  );
  const mapData = useMemo(() => {
    if (!provinceFeature) {
      return {
        pathData: '',
        markers: [] as LandmarkMarker[],
      };
    }

    const projection = geoMercator().fitSize([360, 420], provinceFeature);
    const pathGenerator = geoPath(projection);
    const markers = culturalPlaces
      .map((place) => {
        const point = projection([place.lng, place.lat]);

        if (!point) {
          return null;
        }

        return {
          id: place.id,
          name: place.name,
          district: place.district,
          category: place.category,
          x: point[0],
          y: point[1],
        };
      })
      .filter((marker): marker is LandmarkMarker => Boolean(marker));

    return {
      pathData: pathGenerator(provinceFeature) ?? '',
      markers,
    };
  }, [culturalPlaces, provinceFeature]);

  return (
    <Box
      sx={{
        mx: 'auto',
        width: { xs: 300, sm: 380 },
        maxWidth: 1,
        aspectRatio: '1 / 1.15',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg
        viewBox="0 0 360 420"
        width="100%"
        height="100%"
        role="img"
        aria-label={`${provinceName} province map`}
      >
        {mapData.pathData ? (
          <>
            <path
              d={mapData.pathData}
              fill={theme.palette.primary.darker}
              stroke={alpha(theme.palette.common.white, 0.9)}
              strokeWidth={1.8}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {/*
              ปิดการวาดเส้นแบ่งอำเภอไว้ก่อน เพราะต้องโหลดและ render path จำนวนมาก
              ทำให้หน้า province detail หน่วง โดยเฉพาะจังหวัดที่มีอำเภอ/geometry เยอะ
            */}
            {mapData.markers.map((marker, index) => {
              const labelY = index % 2 === 0 ? marker.y - 18 : marker.y + 28;

              return (
                <g key={marker.id}>
                  <line
                    x1={marker.x}
                    y1={marker.y}
                    x2={marker.x}
                    y2={labelY + (index % 2 === 0 ? 8 : -14)}
                    stroke={alpha(theme.palette.common.white, 0.72)}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r={5.5}
                    fill={CULTURE_CATEGORY_COLORS[marker.category]}
                    stroke={theme.palette.common.white}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={marker.x}
                    y={labelY}
                    fill={theme.palette.common.white}
                    fontSize={12}
                    fontWeight={900}
                    textAnchor="middle"
                    paintOrder="stroke"
                    stroke={alpha(theme.palette.primary.darker, 0.82)}
                    strokeWidth={3}
                    strokeLinejoin="round"
                  >
                    {marker.name}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <text
            x="180"
            y="210"
            fill={theme.palette.text.secondary}
            fontSize={15}
            fontWeight={700}
            textAnchor="middle"
          >
            กำลังโหลดแผนที่
          </text>
        )}
      </svg>
    </Box>
  );
}

export function ProvinceDetailView() {
  const theme = useTheme();
  const params = useParams<{ provinceId?: string | string[] }>();
  const searchParams = useSearchParams();
  const rawProvinceId = params.provinceId;
  const provinceId = (Array.isArray(rawProvinceId) ? rawProvinceId[0] : rawProvinceId) ?? '';
  const provinceName = searchParams.get('name') ?? undefined;
  const provinceDisplayName = getProvinceDisplayName(provinceId, provinceName);
  const culturalPlaces = useMemo(
    () => getProvinceCulturalPlaces(provinceId, provinceName),
    [provinceId, provinceName]
  );
  const cultureMetrics = useMemo(() => getCultureMetrics(culturalPlaces), [culturalPlaces]);

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#7b8476',
        backgroundImage: `
          radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
          linear-gradient(180deg, #6f8790 0%, #7b8476 54%, #8f7c5c 100%)
        `,
        color: 'text.primary',
        minHeight: '100vh',
        py: { xs: 3, md: '10%' },
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          width: 1,
          zIndex: 1,
          maxWidth: 720,
          position: 'relative',
          px: { xs: 2, sm: 3 },
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: theme.palette.common.white,
            textAlign: 'center',
            fontWeight: 900,
            fontSize: { xs: 42, sm: 54 },
          }}
        >
          {provinceDisplayName}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          alignItems="center"
          sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}
        >
          <Chip
            label={`${culturalPlaces.length} สถานที่สำคัญ`}
            sx={{
              height: 32,
              px: 0.6,
              fontWeight: 800,
              borderRadius: 99,
              color: theme.palette.grey[900],
              border: `1px solid ${theme.palette.primary.main}`,
              bgcolor: alpha(theme.palette.primary.lighter, 0.28),
            }}
          />
          <Chip
            icon={<Iconify icon="custom:location-fill" />}
            label="Thailand Cultural"
            variant="outlined"
            sx={{ height: 32, borderRadius: 99, fontWeight: 800 }}
          />
        </Stack>

        <Typography sx={{ mt: 1, textAlign: 'center', fontWeight: 700 }}>
          สำรวจมรดก วัด ธรรมชาติ หัตถกรรม และเรื่องเล่าท้องถิ่นของจังหวัด
        </Typography>

        <Box sx={{ mt: 4 }}>
          {!!provinceId && (
            <ProvinceShapeMap provinceId={provinceId} provinceName={provinceDisplayName} />
          )}
        </Box>

        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ mt: 2.5, textAlign: 'center', gap: 1 }}
        >
          {cultureMetrics.map((item) => (
            <Box key={item.label} sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{item.label}</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: 14, sm: 16 } }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 5, mb: 1.5 }}>
          <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 13 }}>
            <Iconify icon="solar:list-bold" width={15} /> สถานที่และวัฒนธรรม
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 13 }}>
            หมวดหมู่ / พิกัด
          </Typography>
        </Stack>

        <Stack spacing={1.5}>
          {culturalPlaces.length ? (
            culturalPlaces.map((place, index) => (
              <Box
                key={place.id}
                sx={{
                  p: { xs: 1.6, sm: 2 },
                  borderRadius: 1,
                  border: `1px solid ${alpha(theme.palette.grey[500], 0.22)}`,
                  bgcolor: alpha(theme.palette.common.white, index % 2 ? 0.72 : 0.64),
                  backdropFilter: 'blur(6px)',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  spacing={1.4}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: 17, sm: 20 } }}>
                      {place.name}
                    </Typography>
                    <Typography sx={{ mt: 0.4, color: 'text.secondary', fontSize: 13 }}>
                      {place.district} · {place.highlight}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={CULTURE_CATEGORY_LABELS[place.category]}
                    sx={{
                      flexShrink: 0,
                      color: 'white',
                      fontWeight: 800,
                      bgcolor: CULTURE_CATEGORY_COLORS[place.category],
                    }}
                  />
                </Stack>
                <Typography
                  sx={{ mt: 1.2, color: 'text.secondary', fontSize: 14, lineHeight: 1.7 }}
                >
                  {place.description}
                </Typography>
                <Stack direction="row" spacing={1.2} sx={{ mt: 1.4, color: 'text.secondary' }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon="custom:location-fill" width={16} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                      {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                    ใช้พิกัดวางหมุดบนแผนที่
                  </Typography>
                </Stack>
              </Box>
            ))
          ) : (
            <Box
              sx={{
                p: 3,
                borderRadius: 1,
                textAlign: 'center',
                bgcolor: alpha(theme.palette.primary.lighter, 0.18),
                border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
              }}
            >
              <Typography sx={{ fontWeight: 900 }}>ยังไม่มีข้อมูลสถานที่ของจังหวัดนี้</Typography>
              <Typography sx={{ mt: 0.8, color: 'text.secondary', fontSize: 14 }}>
                สามารถเพิ่มชื่อสถานที่ หมวดหมู่ และพิกัด latitude/longitude ได้ในชุดข้อมูลจังหวัด
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
