'use client';

import type { ReactElement } from 'react';
import type { Feature, Geometry, GeoJsonProperties } from 'geojson';
import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';

import { useMemo, useState } from 'react';
import { geoPath, geoMercator } from 'd3-geo';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';

import { mergeCulturalPlaces } from './province-detail-utils';
import {
  rewindGeometry,
  useThailandDistrictCenters,
  useThailandDistrictBoundaries,
} from '../thailand-geojson';

type ProvinceFeature = Feature<Geometry, GeoJsonProperties>;

type LandmarkMarker = {
  id: string;
  name: string;
  district: string;
  highlight: string;
  category: string;
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
  label: string;
  x: number;
  y: number;
  count: number;
  title: string;
};

type ProvinceShapeMapProps = {
  provinceId: string;
  provinceName: string;
  places: CulturalPlace[];
  categoryConfig: CategoryConfigMap;
  onDistrictSelect?: (district: string) => void;
};

function normalizeDistrictName(value?: string | null) {
  return (value ?? '')
    .replace(/^อำเภอ/, '')
    .replace(/^เขต/, '')
    .replace(/\s+District$/i, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function getMapCalloutPlaces(places: CulturalPlace[]) {
  const tatPlaces = places.filter((place) => place.source === 'tat').slice(0, 2);
  const fineArtsPlaces = places
    .filter(
      (place) =>
        place.source === 'finearts_monument' ||
        place.source === 'finearts_archeology' ||
        place.source === 'finearts_buddha' ||
        place.source === 'finearts_museum'
    )
    .slice(0, 2);
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

function getDistrictClusters(
  markers: LandmarkMarker[],
  districtCenters: Map<string, [number, number]>
) {
  const groups = new Map<string, LandmarkMarker[]>();
  markers.forEach((marker) => {
    const label = marker.district || 'ไม่ระบุอำเภอ';
    const group = groups.get(label) ?? [];
    group.push(marker);
    groups.set(label, group);
  });
  return Array.from(groups, ([label, group]) => {
    const point = districtCenters.get(normalizeDistrictName(label)) ?? [
      group.reduce((sum, marker) => sum + marker.x, 0) / group.length,
      group.reduce((sum, marker) => sum + marker.y, 0) / group.length,
    ];
    return {
      id: label,
      label,
      x: point[0],
      y: point[1],
      count: group.length,
      title: `${label} · ${group.length} สถานที่`,
    };
  }).sort((a, b) => b.count - a.count);
}

function DistrictTooltip({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactElement;
}) {
  return (
    <Tooltip
      arrow
      placement="top"
      followCursor
      enterDelay={60}
      leaveDelay={0}
      disableInteractive
      title={
        <Box sx={{ p: 0.5 }}>
          <Box sx={{ color: 'text.primary', fontSize: 14, fontWeight: 700 }}>{label}</Box>
          <Box sx={{ mt: 0.5, color: 'text.secondary', fontSize: 12 }}>
            {count
              ? `สถานที่และข้อมูลวัฒนธรรม ${count.toLocaleString('th-TH')} รายการ`
              : 'ยังไม่มีข้อมูลสถานที่ในหมวดที่เลือก'}
          </Box>
          <Box sx={{ mt: 0.75, color: '#526c56', fontSize: 11 }}>กดเพื่อสำรวจอำเภอนี้ ↗</Box>
        </Box>
      }
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 1,
            boxShadow: '0 6px 24px rgba(30,45,35,0.12)',
          },
        },
        arrow: { sx: { color: 'background.paper' } },
      }}
    >
      {children}
    </Tooltip>
  );
}

export function ProvinceShapeMap({
  provinceId,
  provinceName,
  places,
  categoryConfig,
  onDistrictSelect,
}: ProvinceShapeMapProps) {
  const theme = useTheme();
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const { data: districtBoundaries } = useThailandDistrictBoundaries(provinceId);
  const { data: districtCentersData } = useThailandDistrictCenters(provinceId);

  const provinceFeature = useMemo(() => {
    const outline = (
      districtBoundaries as typeof districtBoundaries & { provinceOutline?: ProvinceFeature }
    )?.provinceOutline;
    return outline ? { ...outline, geometry: rewindGeometry(outline.geometry) } : null;
  }, [districtBoundaries]);
  const mapData = useMemo(() => {
    if (!provinceFeature) {
      return {
        pathData: '',
        districtPaths: [] as { name: string; path: string }[],
        markers: [] as LandmarkMarker[],
        clusters: [] as MarkerCluster[],
      };
    }

    const projection = geoMercator().fitExtent(
      [
        [30, 24],
        [590, 696],
      ],
      provinceFeature
    );
    const pathGenerator = geoPath(projection);
    const districtCenters = new Map<string, [number, number]>();

    districtCentersData?.districts.forEach((district) => {
      const point = projection([district.lng, district.lat]);

      if (point) {
        districtCenters.set(normalizeDistrictName(district.name), point);
      }
    });

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
          district: place.district || 'ไม่ระบุอำเภอ',
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
      districtPaths: (districtBoundaries?.features ?? [])
        .map((feature) => ({
          name: String(feature.properties?.nameTh ?? feature.properties?.shapeName ?? ''),
          path: pathGenerator({ ...feature, geometry: rewindGeometry(feature.geometry) }) ?? '',
        }))
        .filter((district) => Boolean(district.path)),
      pathData: pathGenerator(provinceFeature) ?? '',
      markers,
      clusters: getDistrictClusters(markers, districtCenters),
    };
  }, [districtBoundaries, districtCentersData?.districts, places, provinceFeature]);

  const districtCounts = useMemo(
    () =>
      new Map(
        mapData.clusters.map((cluster) => [normalizeDistrictName(cluster.label), cluster.count])
      ),
    [mapData.clusters]
  );

  return (
    <Box
      sx={{
        mx: 'auto',
        width: 1,
        maxWidth: { xs: 520, sm: 720, md: 920, lg: 1080 },
        display: 'flex',
        flexDirection: 'column',
        '& svg [role=button]:focus': { outline: 'none' },
        '& svg path[role=button]:focus-visible': { stroke: '#826a40', strokeWidth: 2 },
        '& g[role=button]:hover circle, & g[role=button]:focus-visible circle': {
          strokeWidth: 3,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 2, sm: 3 },
          pt: 2.5,
        }}
      >
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 700, color: '#293c34' }}>สำรวจรายอำเภอ</Box>
          <Box sx={{ mt: 0.5, fontSize: 12, color: 'text.secondary' }}>
            {provinceName} · {mapData.clusters.length} อำเภอที่มีข้อมูล
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            fontSize: 11,
            color: 'text.secondary',
          }}
        >
          <Box
            component="span"
            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#426452' }}
          />{' '}
          จำนวนสถานที่
        </Box>
      </Box>
      <svg
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          maxHeight: 820,
          margin: '8px auto',
        }}
        viewBox="0 0 620 720"
        width="100%"
        height="auto"
        role="group"
        aria-label={`แผนที่อำเภอจังหวัด${provinceName}`}
      >
        {mapData.pathData ? (
          <>
            <defs>
              <clipPath id={`province-guide-clip-${provinceId.replace(/[^a-zA-Z0-9]/g, '-')}`}>
                <path d={mapData.pathData} />
              </clipPath>
            </defs>

            <path
              d={mapData.pathData}
              fill="#e4ebe1"
              stroke="#839b7c"
              strokeWidth={1.2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <g
              clipPath={`url(#province-guide-clip-${provinceId.replace(/[^a-zA-Z0-9]/g, '-')})`}
              fill="none"
              stroke="#4e694c"
              strokeOpacity={0.65}
              strokeWidth={0.8}
              strokeLinejoin="round"
            >
              {mapData.districtPaths.map((district) => (
                <DistrictTooltip
                  key={district.name}
                  label={district.name}
                  count={districtCounts.get(normalizeDistrictName(district.name)) ?? 0}
                >
                  <path
                    d={district.path}
                    role="button"
                    tabIndex={0}
                    aria-label={`${district.name} ${districtCounts.get(normalizeDistrictName(district.name)) ?? 0} รายการ กดเพื่อสำรวจ`}
                    fill={
                      normalizeDistrictName(hoveredDistrict) ===
                      normalizeDistrictName(district.name)
                        ? '#d3dfc8'
                        : 'transparent'
                    }
                    pointerEvents="all"
                    onMouseEnter={() => setHoveredDistrict(district.name)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                    onFocus={() => setHoveredDistrict(district.name)}
                    onBlur={() => setHoveredDistrict(null)}
                    onClick={() => onDistrictSelect?.(district.name)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onDistrictSelect?.(district.name);
                      }
                    }}
                    style={{ cursor: 'pointer', transition: 'fill 160ms ease' }}
                    vectorEffect="non-scaling-stroke"
                  />
                </DistrictTooltip>
              ))}
            </g>
            {mapData.clusters.map((cluster) => (
              <DistrictTooltip key={cluster.id} label={cluster.label} count={cluster.count}>
                <g
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => setHoveredDistrict(cluster.label)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  onFocus={() => setHoveredDistrict(cluster.label)}
                  onBlur={() => setHoveredDistrict(null)}
                  aria-label={`${cluster.title} กดเพื่อดูรายการ`}
                  onClick={() => onDistrictSelect?.(cluster.label)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onDistrictSelect?.(cluster.label);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={cluster.count > 99 ? 14 : 11.5}
                    fill={
                      normalizeDistrictName(hoveredDistrict) ===
                      normalizeDistrictName(cluster.label)
                        ? '#a67c38'
                        : '#426452'
                    }
                    stroke="white"
                    strokeWidth={1.8}
                    style={{ transition: 'fill 150ms' }}
                  />
                  <text
                    x={cluster.x}
                    y={cluster.y}
                    dy="0.35em"
                    textAnchor="middle"
                    fill="white"
                    fontSize={10}
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    {cluster.count}
                  </text>
                </g>
              </DistrictTooltip>
            ))}
          </>
        ) : (
          <text
            x="310"
            y="360"
            fill={theme.palette.text.secondary}
            fontSize={15}
            fontWeight={700}
            textAnchor="middle"
          >
            กำลังโหลดแผนที่
          </text>
        )}
      </svg>
      <Box
        sx={{
          width: 1,
          px: { xs: 2, sm: 3 },
          pb: 2.5,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'rgba(66,100,82,0.12)',
        }}
      >
        <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>เลือกอำเภอที่สนใจ</Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            columnGap: 2,
            rowGap: 0.25,
          }}
        >
          {mapData.clusters.map((cluster) => (
            <Box
              key={cluster.id}
              component="button"
              onClick={() => onDistrictSelect?.(cluster.label)}
              onMouseEnter={() => setHoveredDistrict(cluster.label)}
              onMouseLeave={() => setHoveredDistrict(null)}
              onFocus={() => setHoveredDistrict(cluster.label)}
              onBlur={() => setHoveredDistrict(null)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                border: 0,
                bgcolor: hoveredDistrict === cluster.label ? '#e4ebe0' : 'transparent',
                color: 'text.primary',
                borderRadius: 1,
                px: 1,
                py: 1,
                font: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 150ms',
                '&:hover, &:focus-visible': { bgcolor: '#e4ebe0' },
              }}
            >
              {cluster.label}
              <Box
                component="span"
                sx={{
                  color: '#526c56',
                  fontWeight: 700,
                  fontSize: 11,
                  bgcolor: '#e8eee4',
                  borderRadius: 1,
                  px: 0.75,
                  minWidth: 24,
                  textAlign: 'center',
                }}
              >
                {cluster.count}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ px: 2, pb: 1, textAlign: 'right', fontSize: 10, color: 'text.secondary' }}>
        ขอบเขตอำเภอ:{' '}
        <Box
          component="a"
          href="https://www.geoboundaries.org/"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: 'inherit' }}
        >
          geoBoundaries · RTSD / OCHA (CC BY 3.0 IGO)
        </Box>
      </Box>
    </Box>
  );
}
