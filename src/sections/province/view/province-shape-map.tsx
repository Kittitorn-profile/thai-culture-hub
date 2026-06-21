'use client';

import type { Feature, Geometry, GeoJsonProperties } from 'geojson';
import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';

import { useMemo } from 'react';
import { geoPath, geoMercator } from 'd3-geo';

import Box from '@mui/material/Box';
import { alpha, lighten, useTheme } from '@mui/material/styles';

import { getCategoryColor } from '../category-config';
import { mergeCulturalPlaces } from './province-detail-utils';
import {
  rewindGeometry,
  useThailandDistrictCenters,
  useThailandProvincesGeoJson,
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
  x: number;
  y: number;
  cardX: number;
  cardY: number;
  cardWidth: number;
  count: number;
  label: string;
  category: string;
  title: string;
  variant: 'card' | 'dot';
};

type ProvinceShapeMapProps = {
  provinceId: string;
  provinceName: string;
  places: CulturalPlace[];
  categoryConfig: CategoryConfigMap;
  onDistrictSelect?: (district: string) => void;
};

const CLUSTER_CARD_MIN_WIDTH = 82;
const CLUSTER_CARD_MAX_WIDTH = 280;
const CLUSTER_CARD_HEIGHT = 26;
const CLUSTER_CARD_TEXT_X = 42;
const CLUSTER_CARD_CENTER_X = CLUSTER_CARD_MIN_WIDTH / 2;
const CLUSTER_CARD_CENTER_Y = CLUSTER_CARD_HEIGHT / 2;
const CLUSTER_CARD_GAP = 10;

function getConnectorColor(color: string) {
  return alpha(lighten(color, 0.28), 0.82);
}

function getClusterCardWidth(label: string) {
  const labelLength = Array.from(label).length;

  return Math.min(
    Math.max(CLUSTER_CARD_MIN_WIDTH, CLUSTER_CARD_TEXT_X + labelLength * 8.2 + 12),
    CLUSTER_CARD_MAX_WIDTH
  );
}

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

function normalizeDistrictName(value?: string | null) {
  return (value ?? '')
    .replace(/^อำเภอ/, '')
    .replace(/^เขต/, '')
    .replace(/\s+District$/i, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function getNearestDistrictCenter(
  point: [number, number],
  districtCenters: Map<string, [number, number]>
) {
  let nearestCenter: [number, number] | null = null;
  let nearestDistance = Infinity;

  districtCenters.forEach((districtCenter) => {
    const distance = Math.hypot(point[0] - districtCenter[0], point[1] - districtCenter[1]);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCenter = districtCenter;
    }
  });

  return nearestCenter;
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
  center: [number, number],
  districtCenters: Map<string, [number, number]>,
  provinceBounds: [[number, number], [number, number]]
) {
  const clusterMap = new Map<
    string,
    MarkerCluster & { totalX: number; totalY: number; titles: string[] }
  >();

  markers.forEach((marker) => {
    const label = marker.district || 'ไม่ระบุอำเภอ';
    const cluster = clusterMap.get(label);

    if (!cluster) {
      clusterMap.set(label, {
        id: label,
        label,
        x: marker.x,
        y: marker.y,
        cardX: marker.x,
        cardY: marker.y,
        cardWidth: getClusterCardWidth(label),
        totalX: marker.x,
        totalY: marker.y,
        count: 1,
        category: marker.category,
        title: `${marker.number}. ${marker.name}`,
        titles: [`${marker.number}. ${marker.name}`],
        variant: 'dot',
      });

      return;
    }

    cluster.count += 1;
    cluster.totalX += marker.x;
    cluster.totalY += marker.y;
    cluster.x = cluster.totalX / cluster.count;
    cluster.y = cluster.totalY / cluster.count;

    if (cluster.titles.length < 12) {
      cluster.titles.push(`${marker.number}. ${marker.name}`);
      cluster.title = cluster.titles.join('\n');
    }
  });

  const baseCardSlots = [
    { x: 18, y: 32 },
    { x: 18, y: 92 },
    { x: 150, y: 22 },
    { x: 286, y: 22 },
    { x: 490, y: 32 },
    { x: 490, y: 92 },
    { x: 18, y: 156 },
    { x: 490, y: 156 },
    { x: 18, y: 284 },
    { x: 490, y: 284 },
    { x: 18, y: 354 },
    { x: 490, y: 354 },
    { x: 18, y: 430 },
    { x: 150, y: 438 },
    { x: 286, y: 438 },
    { x: 490, y: 430 },
  ];
  const cardSlots = baseCardSlots.map((slot) => {
    const slotCenterX = slot.x + CLUSTER_CARD_CENTER_X;
    const slotCenterY = slot.y + CLUSTER_CARD_CENTER_Y;

    return {
      x: slot.x + (center[0] - slotCenterX) * 0.3,
      y: slot.y + (center[1] - slotCenterY) * 0.3,
    };
  });
  const usedSlots = new Set<number>();

  const clusters = Array.from(clusterMap.values())
    .sort((a, b) => b.count - a.count)
    .map(({ totalX, totalY, titles, ...cluster }, index) => {
      const cardWidth = getClusterCardWidth(cluster.label);
      const cardCenterX = cardWidth / 2;
      const districtCenter =
        districtCenters.get(normalizeDistrictName(cluster.label)) ??
        getNearestDistrictCenter([cluster.x, cluster.y], districtCenters);
      const clusterX = districtCenter?.[0] ?? cluster.x;
      const clusterY = districtCenter?.[1] ?? cluster.y;
      const isCard = index < cardSlots.length;
      const clusterAngle = Math.atan2(clusterY - center[1], clusterX - center[0]);
      const slotIndex = isCard
        ? cardSlots.reduce((bestIndex, slot, currentIndex) => {
            if (usedSlots.has(currentIndex)) {
              return bestIndex;
            }

            const slotCenterX = slot.x + cardCenterX;
            const slotCenterY = slot.y + CLUSTER_CARD_CENTER_Y;
            const slotAngle = Math.atan2(slotCenterY - center[1], slotCenterX - center[0]);
            const angleDistance = Math.abs(
              Math.atan2(Math.sin(clusterAngle - slotAngle), Math.cos(clusterAngle - slotAngle))
            );
            const distance = Math.hypot(clusterX - slotCenterX, clusterY - slotCenterY);
            const score = distance + angleDistance * 80;

            if (bestIndex < 0) {
              return currentIndex;
            }

            const bestSlot = cardSlots[bestIndex];
            const bestSlotCenterX = bestSlot.x + cardCenterX;
            const bestSlotCenterY = bestSlot.y + CLUSTER_CARD_CENTER_Y;
            const bestSlotAngle = Math.atan2(
              bestSlotCenterY - center[1],
              bestSlotCenterX - center[0]
            );
            const bestAngleDistance = Math.abs(
              Math.atan2(
                Math.sin(clusterAngle - bestSlotAngle),
                Math.cos(clusterAngle - bestSlotAngle)
              )
            );
            const bestDistance = Math.hypot(clusterX - bestSlotCenterX, clusterY - bestSlotCenterY);
            const bestScore = bestDistance + bestAngleDistance * 80;

            return score < bestScore ? currentIndex : bestIndex;
          }, -1)
        : -1;

      if (slotIndex >= 0) {
        usedSlots.add(slotIndex);
      }

      const slot = slotIndex >= 0 ? cardSlots[slotIndex] : { x: cluster.x, y: cluster.y };

      return {
        ...cluster,
        x: clusterX,
        y: clusterY,
        cardX: slot.x,
        cardY: slot.y,
        cardWidth,
        variant: isCard ? 'card' : 'dot',
      } satisfies MarkerCluster;
    });

  for (let pass = 0; pass < 10; pass += 1) {
    clusters.forEach((cluster, index) => {
      if (cluster.variant !== 'card') {
        return;
      }

      clusters.slice(index + 1).forEach((nextCluster) => {
        if (nextCluster.variant !== 'card') {
          return;
        }

        const clusterCenterX = cluster.cardX + cluster.cardWidth / 2;
        const clusterCenterY = cluster.cardY + CLUSTER_CARD_CENTER_Y;
        const nextCenterX = nextCluster.cardX + nextCluster.cardWidth / 2;
        const nextCenterY = nextCluster.cardY + CLUSTER_CARD_CENTER_Y;
        const overlapX =
          (cluster.cardWidth + nextCluster.cardWidth) / 2 +
          CLUSTER_CARD_GAP -
          Math.abs(clusterCenterX - nextCenterX);
        const overlapY =
          CLUSTER_CARD_HEIGHT + CLUSTER_CARD_GAP - Math.abs(clusterCenterY - nextCenterY);

        if (overlapX <= 0 || overlapY <= 0) {
          return;
        }

        if (overlapX < overlapY) {
          const direction = clusterCenterX <= nextCenterX ? -1 : 1;

          cluster.cardX += (overlapX / 2) * direction;
          nextCluster.cardX -= (overlapX / 2) * direction;
        } else {
          const direction = clusterCenterY <= nextCenterY ? -1 : 1;

          cluster.cardY += (overlapY / 2) * direction;
          nextCluster.cardY -= (overlapY / 2) * direction;
        }
      });

      const cardRight = cluster.cardX + cluster.cardWidth;
      const cardBottom = cluster.cardY + CLUSTER_CARD_HEIGHT;
      const mapLeft = provinceBounds[0][0] - 8;
      const mapTop = provinceBounds[0][1] - 8;
      const mapRight = provinceBounds[1][0] + 8;
      const mapBottom = provinceBounds[1][1] + 8;
      const overlapMapX = Math.min(cardRight, mapRight) - Math.max(cluster.cardX, mapLeft);
      const overlapMapY = Math.min(cardBottom, mapBottom) - Math.max(cluster.cardY, mapTop);

      if (overlapMapX > 0 && overlapMapY > 0) {
        const clusterCenterX = cluster.cardX + cluster.cardWidth / 2;
        const clusterCenterY = cluster.cardY + CLUSTER_CARD_CENTER_Y;

        if (overlapMapX < overlapMapY) {
          cluster.cardX += clusterCenterX < center[0] ? -(overlapMapX + 12) : overlapMapX + 12;
        } else {
          cluster.cardY += clusterCenterY < center[1] ? -(overlapMapY + 12) : overlapMapY + 12;
        }
      }

      cluster.cardX = Math.min(Math.max(cluster.cardX, 8), 620 - cluster.cardWidth - 8);
      cluster.cardY = Math.min(Math.max(cluster.cardY, 8), 520 - CLUSTER_CARD_HEIGHT - 8);
    });
  }

  return clusters;
}

function getClusterConnectorPath(cluster: MarkerCluster) {
  const targetX = cluster.variant === 'card' ? cluster.cardX + cluster.cardWidth / 2 : cluster.x;
  const targetY = cluster.variant === 'card' ? cluster.cardY + CLUSTER_CARD_CENTER_Y : cluster.y;
  const midX = (cluster.x + targetX) / 2;
  const curve = cluster.x < targetX ? -32 : 32;
  const controlX1 = midX + curve;
  const controlY1 = cluster.y;
  const controlX2 = midX - curve;
  const controlY2 = targetY;

  return `M ${cluster.x} ${cluster.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;
}

export function ProvinceShapeMap({
  provinceId,
  provinceName,
  places,
  categoryConfig,
  onDistrictSelect,
}: ProvinceShapeMapProps) {
  const theme = useTheme();
  const { data: provincesGeoJson } = useThailandProvincesGeoJson();
  const { data: districtCentersData } = useThailandDistrictCenters(provinceId);

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
    const provinceBounds = pathGenerator.bounds(provinceFeature);
    const center = projection(geoPath().centroid(provinceFeature) as [number, number]) ?? [
      310, 260,
    ];
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
      pathData: pathGenerator(provinceFeature) ?? '',
      markers,
      clusters: getDistrictClusters(markers, center, districtCenters, provinceBounds),
    };
  }, [districtCentersData?.districts, places, provinceFeature]);

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
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="7 6"
                opacity={0.82}
              />
            </g>
            {mapData.clusters.map((cluster) => {
              const clusterColor = getCategoryColor(categoryConfig, cluster.category);

              return (
                <g
                  key={cluster.id}
                  role="button"
                  tabIndex={0}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onDistrictSelect?.(cluster.label)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      onDistrictSelect?.(cluster.label);
                    }
                  }}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  <title>{cluster.title}</title>
                  {cluster.variant === 'dot' && (
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={3.5}
                      fill={clusterColor}
                      stroke="#fff7df"
                      strokeWidth={1.8}
                      opacity={0.95}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {cluster.variant === 'card' && (
                    <>
                      <path
                        d={getClusterConnectorPath(cluster)}
                        fill="none"
                        stroke={getConnectorColor(clusterColor)}
                        strokeWidth={3.4}
                        strokeDasharray="3 6"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={3}
                        fill={clusterColor}
                        stroke="#fff7df"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                      <rect
                        x={cluster.cardX}
                        y={cluster.cardY}
                        width={cluster.cardWidth}
                        height={CLUSTER_CARD_HEIGHT}
                        rx="14"
                        fill="#fffaf0"
                        stroke={alpha('#5b4630', 0.1)}
                        strokeWidth="1"
                        filter="drop-shadow(0 7px 10px rgba(69,50,31,0.18))"
                      />
                      <circle
                        cx={cluster.cardX + 13}
                        cy={cluster.cardY + 13}
                        r={13}
                        fill={clusterColor}
                        stroke="#ffffff"
                        strokeWidth={3}
                        filter="drop-shadow(0 2px 3px rgba(71,45,22,0.22))"
                        vectorEffect="non-scaling-stroke"
                      />
                      <text
                        x={cluster.cardX + 13}
                        y={cluster.cardY + 19}
                        fill="#fff6e4"
                        fontSize={14}
                        fontWeight={900}
                        textAnchor="middle"
                      >
                        {cluster.count}
                      </text>
                      <text
                        x={cluster.cardX + CLUSTER_CARD_TEXT_X}
                        y={cluster.cardY + 18}
                        fill={clusterColor}
                        fontSize={13}
                        fontWeight={900}
                        textAnchor="start"
                      >
                        {cluster.label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {mapData.markers
              .filter((marker) => marker.hasCallout && mapData.clusters.length === 0)
              .map((marker, index) => {
                const markerColor = getCategoryColor(categoryConfig, marker.category);
                const calloutRadius = 29;
                const calloutEdgeX =
                  marker.calloutX + (marker.side === 'left' ? calloutRadius : -calloutRadius);
                const controlX = (marker.x + calloutEdgeX) / 2;
                const controlY = Math.min(marker.y, marker.calloutY) - 42 + index * 8;
                const markerClipPathId = `province-guide-marker-${marker.id.replace(
                  /[^a-zA-Z0-9]/g,
                  '-'
                )}`;
                const isLabelShifted =
                  Math.hypot(marker.labelX - marker.x, marker.labelY - marker.y) > 2;

                return (
                  <g key={marker.id}>
                    <clipPath id={markerClipPathId}>
                      <circle cx={marker.calloutX} cy={marker.calloutY} r={calloutRadius - 2} />
                    </clipPath>
                    <path
                      d={`M ${marker.x} ${marker.y} Q ${controlX} ${controlY} ${calloutEdgeX} ${marker.calloutY}`}
                      fill="none"
                      stroke={markerColor}
                      strokeWidth={5}
                      strokeDasharray="7 7"
                      strokeLinecap="round"
                      opacity={0.9}
                    />
                    <circle cx={marker.x} cy={marker.y} r={3} fill="#111" opacity={0.84} />
                    {isLabelShifted && (
                      <line
                        x1={marker.x}
                        y1={marker.y}
                        x2={marker.labelX}
                        y2={marker.labelY}
                        stroke={alpha(markerColor, 0.68)}
                        strokeWidth={5}
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
