'use client';

import type { Feature, Geometry, GeoJsonProperties } from 'geojson';
import type { CulturalPlace } from '../province-data';

import { geoPath, geoMercator } from 'd3-geo';
import { useMemo, useState, useEffect } from 'react';
import { Grid } from 'node_modules/@mui/material/esm';
import { useParams, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';
import { TruncatedTypography } from 'src/components/typography';

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
  highlight: string;
  category: keyof typeof CULTURE_CATEGORY_COLORS;
  imageHref?: string;
  number: number;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  side: 'left' | 'right';
  calloutX: number;
  calloutY: number;
  hasCallout: boolean;
};

type MarkerCluster = {
  id: string;
  x: number;
  y: number;
  count: number;
  category: keyof typeof CULTURE_CATEGORY_COLORS;
  title: string;
};

const CULTURAL_PLACE_CARD_IMAGES = [
  '/assets/images/mock/travel/travel-1.webp',
  '/assets/images/mock/travel/travel-3.webp',
  '/assets/images/mock/travel/travel-7.webp',
  '/assets/images/mock/travel/travel-10.webp',
  '/assets/images/mock/travel/travel-14.webp',
];

function getCulturalPlaceCardImage(index: number) {
  return CULTURAL_PLACE_CARD_IMAGES[index % CULTURAL_PLACE_CARD_IMAGES.length];
}

function getPlaceImages(place: CulturalPlace, index: number) {
  return place.imageUrls?.length ? place.imageUrls : [getCulturalPlaceCardImage(index)];
}

function mergeCulturalPlaces(...placeGroups: CulturalPlace[][]) {
  const placeMap = new Map<string, CulturalPlace>();

  placeGroups.flat().forEach((place) => {
    const key = `${place.name}-${place.district}-${place.lat}-${place.lng}`;

    if (!placeMap.has(key)) {
      placeMap.set(key, place);
    }
  });

  return Array.from(placeMap.values());
}

function getMapCalloutPlaces(places: CulturalPlace[]) {
  const tatPlaces = places.filter((place) => place.source === 'tat').slice(0, 2);
  const fineArtsPlaces = places.filter((place) => place.source === 'finearts_archeology').slice(0, 2);
  const culturePlaces = places.filter((place) => place.source === 'culture_catalog').slice(0, 2);
  const localPlaces = places.filter((place) => !place.source || place.source === 'local');
  const markerPlaces = mergeCulturalPlaces(tatPlaces, fineArtsPlaces, culturePlaces, localPlaces);

  return markerPlaces.slice(0, 6);
}

function getSpreadLabelPoint(
  point: [number, number],
  markerPoints: Array<[number, number]>,
  index: number
) {
  const clusterIndex = markerPoints.findIndex(([x, y], pointIndex) => {
    if (pointIndex >= index) {
      return false;
    }

    return Math.hypot(point[0] - x, point[1] - y) < 22;
  });

  if (clusterIndex < 0) {
    return point;
  }

  const siblingCount = markerPoints.filter(
    ([x, y]) => Math.hypot(point[0] - x, point[1] - y) < 22
  ).length;
  const angle = ((index - clusterIndex) / Math.max(siblingCount, 1)) * Math.PI * 2 - Math.PI / 2;
  const radius = 16 + Math.min(siblingCount, 6) * 4;

  return [point[0] + Math.cos(angle) * radius, point[1] + Math.sin(angle) * radius] as [
    number,
    number,
  ];
}

function getMarkerClusters(markers: LandmarkMarker[]) {
  const clusters: Array<MarkerCluster & { totalX: number; totalY: number }> = [];

  markers
    .filter((marker) => !marker.hasCallout)
    .forEach((marker) => {
      const cluster = clusters.find((item) => Math.hypot(marker.x - item.x, marker.y - item.y) < 28);

      if (!cluster) {
        clusters.push({
          id: marker.id,
          x: marker.x,
          y: marker.y,
          totalX: marker.x,
          totalY: marker.y,
          count: 1,
          category: marker.category,
          title: `${marker.number}. ${marker.name}`,
        });

        return;
      }

      cluster.count += 1;
      cluster.totalX += marker.x;
      cluster.totalY += marker.y;
      cluster.x = cluster.totalX / cluster.count;
      cluster.y = cluster.totalY / cluster.count;
      cluster.title = `${cluster.title}\n${marker.number}. ${marker.name}`;
    });

  return clusters.map(({ totalX, totalY, ...cluster }) => cluster);
}

function ProvinceShapeMap({
  provinceId,
  provinceName,
  places,
}: {
  provinceId: string;
  provinceName: string;
  places: CulturalPlace[];
}) {
  const theme = useTheme();
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
        clusters: [] as MarkerCluster[],
      };
    }

    const projection = geoMercator().fitExtent(
      [
        [229, 115],
        [391, 423],
      ],
      provinceFeature
    );
    const pathGenerator = geoPath(projection);
    const calloutPlaceIds = getMapCalloutPlaces(places).map((place) => place.id);
    const projectedPoints = places
      .map((place) => projection([place.lng, place.lat]))
      .filter((point): point is [number, number] => Boolean(point));
    const markers = places
      .map((place, index) => {
        const point = projection([place.lng, place.lat]);

        if (!point) {
          return null;
        }

        const calloutRows = [82, 158, 234, 310, 386, 458];
        const calloutIndex = calloutPlaceIds.indexOf(place.id);
        const hasCallout = calloutIndex >= 0;
        const side = (hasCallout ? calloutIndex : index) % 2 === 0 ? 'left' : 'right';
        const [labelX, labelY] = getSpreadLabelPoint(point, projectedPoints, index);

        return {
          id: place.id,
          name: place.name,
          district: place.district,
          highlight: place.highlight,
          category: place.category,
          number: index + 1,
          x: point[0],
          y: point[1],
          labelX,
          labelY,
          side,
          calloutX: side === 'left' ? 88 : 532,
          calloutY: calloutRows[calloutIndex] ?? 430,
          hasCallout,
        };
      })
      .filter((marker): marker is LandmarkMarker => Boolean(marker));

    return {
      pathData: pathGenerator(provinceFeature) ?? '',
      markers,
      clusters: getMarkerClusters(markers),
    };
  }, [places, provinceFeature]);

  return (
    <Box
      sx={{
        mx: 'auto',
        width: 1,
        maxWidth: 1,
        aspectRatio: { xs: '1 / 1.15', sm: '1.18 / 1' },
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg
        viewBox="0 0 620 520"
        width="100%"
        height="100%"
        role="img"
        aria-label={`${provinceName} travel guide map`}
      >
        {mapData.pathData ? (
          <>
            <defs>
              <filter id="province-guide-paper">
                <feTurbulence baseFrequency="0.75" numOctaves="2" seed="12" type="fractalNoise" />
                <feColorMatrix type="saturate" values="0" />
                <feComponentTransfer>
                  <feFuncA slope="0.055" type="linear" />
                </feComponentTransfer>
              </filter>
              <clipPath id={`province-guide-clip-${provinceId.replace(/[^a-zA-Z0-9]/g, '-')}`}>
                <path d={mapData.pathData} />
              </clipPath>
            </defs>

            <rect
              width="620"
              height="520"
              rx="10"
              fill="#84643b"
              filter="url(#province-guide-paper)"
              opacity="0.2"
            />

            <path
              d={mapData.pathData}
              fill="#8cab67"
              stroke="#5e7042"
              strokeWidth={2.6}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              filter="drop-shadow(0 8px 12px rgba(48,38,24,0.28))"
            />
            <g clipPath={`url(#province-guide-clip-${provinceId.replace(/[^a-zA-Z0-9]/g, '-')})`}>
              <path
                d="M 214 128 C 280 188 246 236 326 294 C 388 338 344 390 410 448"
                fill="none"
                stroke="#d8f4f1"
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.86}
              />
              <path
                d="M 232 418 C 282 356 334 348 397 292"
                fill="none"
                stroke="#f3eee2"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray="8 5"
                opacity={0.86}
              />
              <path
                d="M 222 160 C 286 126 350 142 410 110"
                fill="none"
                stroke="#f4eee1"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="7 6"
                opacity={0.82}
              />
            </g>
            {/*
              ปิดการวาดเส้นแบ่งอำเภอไว้ก่อน เพราะต้องโหลดและ render path จำนวนมาก
              ทำให้หน้า province detail หน่วง โดยเฉพาะจังหวัดที่มีอำเภอ/geometry เยอะ
            */}
            {mapData.clusters.map((cluster) => {
              const clusterColor = CULTURE_CATEGORY_COLORS[cluster.category];
              const radius = cluster.count > 1 ? Math.min(15 + cluster.count * 0.65, 28) : 7;

              return (
                <g key={cluster.id}>
                  <title>{cluster.title}</title>
                  <circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={radius}
                    fill="#111"
                    stroke="#f1ead7"
                    strokeWidth={cluster.count > 1 ? 3 : 2}
                    opacity={0.95}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={Math.max(radius - 4, 4)}
                    fill={clusterColor}
                    opacity={0.94}
                  />
                  {cluster.count > 1 ? (
                    <text
                      x={cluster.x}
                      y={cluster.y + 4}
                      fill="#fff"
                      fontSize={10}
                      fontWeight={900}
                      textAnchor="middle"
                    >
                      +{cluster.count}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {mapData.markers.filter((marker) => marker.hasCallout).map((marker, index) => {
              const markerColor = CULTURE_CATEGORY_COLORS[marker.category];
              const calloutRadius = 29;
              const calloutEdgeX =
                marker.calloutX + (marker.side === 'left' ? calloutRadius : -calloutRadius);
              const controlX = (marker.x + calloutEdgeX) / 2;
              const controlY = Math.min(marker.y, marker.calloutY) - 42 + index * 8;
              const markerClipPathId = `province-guide-marker-${marker.id.replace(
                /[^a-zA-Z0-9]/g,
                '-'
              )}`;

              const isLabelShifted = Math.hypot(marker.labelX - marker.x, marker.labelY - marker.y) > 2;

              return (
                <g key={marker.id}>
                  <clipPath id={markerClipPathId}>
                    <circle cx={marker.calloutX} cy={marker.calloutY} r={calloutRadius - 2} />
                  </clipPath>
                  <path
                    d={`M ${marker.x} ${marker.y} Q ${controlX} ${controlY} ${calloutEdgeX} ${marker.calloutY}`}
                    fill="none"
                    stroke={markerColor}
                    strokeWidth={1.7}
                    strokeDasharray="7 7"
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r={3}
                    fill="#111"
                    opacity={0.84}
                  />
                  {isLabelShifted && (
                    <line
                      x1={marker.x}
                      y1={marker.y}
                      x2={marker.labelX}
                      y2={marker.labelY}
                      stroke={alpha(markerColor, 0.68)}
                      strokeWidth={1.1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <circle
                    cx={marker.labelX}
                    cy={marker.labelY}
                    r={10}
                    fill="#111"
                    stroke="#f1ead7"
                    strokeWidth={3}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={marker.labelX} cy={marker.labelY} r={7} fill={markerColor} />
                  <text
                    x={marker.labelX}
                    y={marker.labelY + 4}
                    fill="#fff"
                    fontSize={9}
                    fontWeight={900}
                    textAnchor="middle"
                  >
                    {marker.number}
                  </text>

                  <circle
                    cx={marker.calloutX - 18}
                    cy={marker.calloutY - 12}
                    r={15}
                    fill={alpha(markerColor, 0.18)}
                  />
                  <circle
                    cx={marker.calloutX + 20}
                    cy={marker.calloutY + 14}
                    r={18}
                    fill={alpha(markerColor, 0.2)}
                  />
                  <circle
                    cx={marker.calloutX}
                    cy={marker.calloutY}
                    r={calloutRadius + 10}
                    fill={alpha(markerColor, 0.2)}
                  />
                  <circle
                    cx={marker.calloutX}
                    cy={marker.calloutY}
                    r={calloutRadius}
                    fill="#f4ead0"
                  />
                  {marker.imageHref ? (
                    <image
                      href={marker.imageHref}
                      x={marker.calloutX - calloutRadius}
                      y={marker.calloutY - calloutRadius}
                      width={calloutRadius * 2}
                      height={calloutRadius * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${markerClipPathId})`}
                    />
                  ) : (
                    <>
                      <circle
                        cx={marker.calloutX}
                        cy={marker.calloutY}
                        r={calloutRadius - 8}
                        fill={alpha(markerColor, 0.18)}
                      />
                      <text
                        x={marker.calloutX}
                        y={marker.calloutY + 4}
                        fill={markerColor}
                        fontSize={19}
                        fontWeight={900}
                        textAnchor="middle"
                      >
                        {marker.number}
                      </text>
                    </>
                  )}
                  <text
                    x={marker.calloutX}
                    y={marker.calloutY + 46}
                    fill="#111"
                    fontSize={11}
                    fontWeight={900}
                    textAnchor="middle"
                  >
                    {marker.name}
                  </text>
                  <text
                    x={marker.calloutX}
                    y={marker.calloutY + 60}
                    fill="#3b3325"
                    fontSize={9}
                    fontWeight={800}
                    textAnchor="middle"
                  >
                    {marker.highlight}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <text
            x="310"
            y="260"
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
  const localCulturalPlaces = useMemo(
    () => getProvinceCulturalPlaces(provinceId, provinceName),
    [provinceId, provinceName]
  );
  const [catalogCulturalPlaces, setCatalogCulturalPlaces] = useState<CulturalPlace[]>([]);
  const [tatCulturalPlaces, setTatCulturalPlaces] = useState<CulturalPlace[]>([]);
  const [fineArtsCulturalPlaces, setFineArtsCulturalPlaces] = useState<CulturalPlace[]>([]);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<CulturalPlace | null>(null);
  const culturalPlaces = useMemo(() => {
    const mergedRemotePlaces = mergeCulturalPlaces(
      tatCulturalPlaces,
      fineArtsCulturalPlaces,
      catalogCulturalPlaces
    );

    return mergedRemotePlaces.length ? mergedRemotePlaces : localCulturalPlaces;
  }, [catalogCulturalPlaces, fineArtsCulturalPlaces, localCulturalPlaces, tatCulturalPlaces]);
  const cultureMetrics = useMemo(() => getCultureMetrics(culturalPlaces), [culturalPlaces]);
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
      ? `${selectedPlaceLat.toFixed(4)}, ${selectedPlaceLng.toFixed(4)}`
      : 'ไม่พบพิกัด';
  const dataSourceLabel = [
    tatCulturalPlaces.length ? 'ททท.' : null,
    fineArtsCulturalPlaces.length ? 'กรมศิลป์' : null,
    catalogCulturalPlaces.length ? 'ข้อมูลวัฒนธรรม' : null,
  ]
    .filter(Boolean)
    .join(' + ');

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
        py: { xs: 3, md: '7%' },
        px: { xs: 2, md: '20%' },
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
            label={dataSourceLabel || (isRemoteLoading ? 'กำลังดึงข้อมูล' : 'Thailand Cultural')}
            variant="outlined"
            sx={{ height: 32, borderRadius: 99, fontWeight: 800 }}
          />
        </Stack>

        <Typography
          sx={{
            mt: 1,
            textAlign: 'center',
            fontWeight: 700,
            color: alpha(theme.palette.common.white, 0.9),
          }}
        >
          สำรวจมรดก วัด ธรรมชาติ หัตถกรรม และเรื่องเล่าท้องถิ่นของจังหวัด
        </Typography>

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

        <Box sx={{ mt: 4 }}>
          {!!provinceId && (
            <ProvinceShapeMap
              places={culturalPlaces}
              provinceId={provinceId}
              provinceName={provinceDisplayName}
            />
          )}
        </Box>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 5, mb: 1.5 }}>
          <Typography
            variant="subtitle1"
            sx={{ color: 'common.white', fontWeight: 700, fontSize: 13 }}
          >
            <Iconify icon="solar:list-bold" width={15} /> สถานที่และวัฒนธรรม
          </Typography>
          <Typography sx={{ color: 'common.white', fontWeight: 700, fontSize: 13 }}>
            หมวดหมู่ / พิกัด
          </Typography>
        </Stack>

        <Box>
          <Grid container spacing={2}>
            {culturalPlaces.length ? (
              culturalPlaces.map((place, index) => {
                const placeImages = getPlaceImages(place, index);
                const cardImage = placeImages[0];
                const accentColor = CULTURE_CATEGORY_COLORS[place.category];
                const placeLat = Number(place.lat);
                const placeLng = Number(place.lng);
                const coordinatesText =
                  Number.isFinite(placeLat) && Number.isFinite(placeLng)
                    ? `${placeLat.toFixed(4)}, ${placeLng.toFixed(4)}`
                    : 'ไม่พบพิกัด';

                return (
                  <Grid size={{ xs: 12, md: 3 }} key={place.id}>
                    <Box
                      key={place.id}
                      sx={{
                        p: 1.1,
                        height: '100%',
                        borderRadius: 2,
                        overflow: 'hidden',
                        bgcolor: '#f8f8f2',
                        border: `1px solid ${alpha(theme.palette.common.white, 0.72)}`,
                        boxShadow: `0 18px 42px ${alpha(theme.palette.grey[900], 0.16)}`,
                      }}
                    >
                      <Box
                        sx={{
                          height: { xs: 220, sm: 200 },
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          position: 'relative',
                          bgcolor: alpha(accentColor, 0.16),
                          backgroundImage: `linear-gradient(180deg, ${alpha(
                            theme.palette.common.black,
                            0.02
                          )} 0%, ${alpha(theme.palette.common.black, 0.16)} 100%), url(${cardImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        <Box
                          sx={{
                            top: 0,
                            left: '50%',
                            px: 2.4,
                            py: 0.8,
                            color: accentColor,
                            fontSize: 12,
                            fontWeight: 900,
                            borderRadius: '0 0 10px 10px',
                            position: 'absolute',
                            transform: 'translateX(-50%)',
                            bgcolor: '#f8f8f2',
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
                            left: 14,
                            bottom: 14,
                            color: 'white',
                            fontWeight: 900,
                            position: 'absolute',
                            bgcolor: alpha(theme.palette.grey[900], 0.72),
                          }}
                        />
                        <Box
                          sx={{
                            top: 14,
                            left: 14,
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
                          {index + 1}
                        </Box>
                      </Box>

                      <Box sx={{ px: { xs: 1, sm: 1.4 }, pt: 1.4, pb: 0.6 }}>
                        <Stack
                          direction="row"
                          alignItems="flex-start"
                          justifyContent="space-between"
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ color: accentColor, fontWeight: 900, fontSize: 14 }}>
                              {place.highlight}
                            </Typography>
                          </Box>
                        </Stack>

                        <Typography
                          sx={{
                            mt: 1.2,
                            color: theme.palette.grey[900],
                            fontSize: { xs: 16, sm: 18 },
                            fontWeight: 900,
                            lineHeight: 1,
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
                          sx={{ mt: 1.8 }}
                        >
                          <Box>
                            <Typography sx={{ color: accentColor, fontSize: 12, fontWeight: 900 }}>
                              Coordinates
                            </Typography>
                            <Typography
                              sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 800 }}
                            >
                              {coordinatesText}
                            </Typography>
                          </Box>

                          <Box
                            component="button"
                            type="button"
                            onClick={() => setSelectedPlace(place)}
                            sx={{
                              m: 0,
                              px: 2.2,
                              py: 1.1,
                              gap: 1,
                              border: 0,
                              color: 'white',
                              display: 'inline-flex',
                              cursor: 'pointer',
                              fontWeight: 900,
                              borderRadius: 1.2,
                              alignItems: 'center',
                              bgcolor: '#f48b2a',
                              boxShadow: `0 10px 22px ${alpha('#f48b2a', 0.26)}`,
                            }}
                          >
                            MORE
                          </Box>
                        </Stack>
                      </Box>
                    </Box>
                  </Grid>
                );
              })
            ) : (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 1,
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.lighter, 0.18),
                  border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                  gridColumn: '1 / -1',
                }}
              >
                <Typography sx={{ fontWeight: 900 }}>ยังไม่มีข้อมูลสถานที่ของจังหวัดนี้</Typography>
                <Typography sx={{ mt: 0.8, color: 'text.secondary', fontSize: 14 }}>
                  สามารถเพิ่มชื่อสถานที่ หมวดหมู่ และพิกัด latitude/longitude ได้ในชุดข้อมูลจังหวัด
                </Typography>
              </Box>
            )}
          </Grid>
        </Box>

        <Dialog
          fullWidth
          maxWidth="md"
          open={Boolean(selectedPlace)}
          onClose={() => setSelectedPlace(null)}
          PaperProps={{
            sx: {
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: '#fbf7ed',
            },
          }}
        >
          {selectedPlace && (
            <>
              <DialogTitle
                sx={{
                  pr: 7,
                  color: theme.palette.grey[900],
                  fontWeight: 900,
                }}
              >
                {selectedPlaceIndex + 1}. {selectedPlace.name}
                <IconButton
                  onClick={() => setSelectedPlace(null)}
                  sx={{ top: 12, right: 12, position: 'absolute' }}
                >
                  <Iconify icon="mingcute:close-line" />
                </IconButton>
              </DialogTitle>

              <DialogContent sx={{ pt: 0, pb: 3 }}>
                <Box
                  sx={{
                    height: { xs: 260, sm: 360 },
                    overflow: 'hidden',
                    borderRadius: 1.5,
                    bgcolor: alpha(CULTURE_CATEGORY_COLORS[selectedPlace.category], 0.16),
                    backgroundImage: `url(${selectedPlaceImages[0]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                {selectedPlaceImages.length > 1 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.2, overflowX: 'auto', pb: 0.5 }}>
                    {selectedPlaceImages.slice(0, 6).map((imageUrl) => (
                      <Box
                        key={imageUrl}
                        sx={{
                          width: 88,
                          height: 64,
                          flex: '0 0 auto',
                          borderRadius: 1,
                          bgcolor: 'grey.200',
                          backgroundImage: `url(${imageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    ))}
                  </Stack>
                )}

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mt: 2, flexWrap: 'wrap' }}
                >
                  <Chip
                    label={CULTURE_CATEGORY_LABELS[selectedPlace.category]}
                    sx={{
                      color: 'white',
                      fontWeight: 900,
                      bgcolor: CULTURE_CATEGORY_COLORS[selectedPlace.category],
                    }}
                  />
                  <Chip
                    icon={<Iconify icon="custom:location-fill" />}
                    label={selectedPlace.district || provinceDisplayName}
                    sx={{ fontWeight: 800 }}
                  />
                  <Chip label={selectedPlaceCoordinates} sx={{ fontWeight: 800 }} />
                </Stack>

                <Typography sx={{ mt: 2, color: 'text.primary', fontWeight: 900 }}>
                  {selectedPlace.highlight}
                </Typography>

                <TruncatedTypography
                  sx={{
                    mt: 1,
                    color: 'text.secondary',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {selectedPlace.description}
                </TruncatedTypography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2.4 }}>
                  {selectedPlace.mapUrl && (
                    <Box
                      component="a"
                      href={selectedPlace.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        px: 2,
                        py: 1,
                        color: 'white',
                        fontWeight: 900,
                        borderRadius: 1,
                        textAlign: 'center',
                        textDecoration: 'none',
                        bgcolor: CULTURE_CATEGORY_COLORS[selectedPlace.category],
                      }}
                    >
                      เปิดแผนที่
                    </Box>
                  )}

                  {selectedPlace.sourceUrl && (
                    <Box
                      component="a"
                      href={selectedPlace.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        px: 2,
                        py: 1,
                        fontWeight: 900,
                        borderRadius: 1,
                        textAlign: 'center',
                        textDecoration: 'none',
                        color: CULTURE_CATEGORY_COLORS[selectedPlace.category],
                        border: `1px solid ${alpha(
                          CULTURE_CATEGORY_COLORS[selectedPlace.category],
                          0.36
                        )}`,
                      }}
                    >
                      ดูแหล่งข้อมูล
                    </Box>
                  )}
                </Stack>
              </DialogContent>
            </>
          )}
        </Dialog>
      </Box>
    </Box>
  );
}
