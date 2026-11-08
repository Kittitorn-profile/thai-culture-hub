import type { CulturalPlace } from './province-data';

type DistrictCenter = { name: string; lat: number; lng: number };

function normalizeDistrictName(value?: string | null) {
  return (value ?? '')
    .replace(/^อำเภอ/, '')
    .replace(/^เขต/, '')
    .replace(/\s+District$/i, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function getNearestDistrictName(place: CulturalPlace, districtCenters: DistrictCenter[]) {
  const placeLat = Number(place.lat);
  const placeLng = Number(place.lng);

  if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng) || !districtCenters.length) {
    return place.district;
  }

  let nearestDistrict = '';
  let nearestDistance = Infinity;

  districtCenters.forEach((district) => {
    const distance = Math.hypot(placeLat - district.lat, placeLng - district.lng);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestDistrict = district.name;
    }
  });

  return nearestDistrict || place.district;
}

export function resolvePlaceDistricts(places: CulturalPlace[], districtCenters: DistrictCenter[]) {
  if (!districtCenters.length) {
    return places;
  }

  const districtNameMap = new Map(
    districtCenters.map((district) => [normalizeDistrictName(district.name), district.name])
  );

  return places.map((place) => {
    const districtName = districtNameMap.get(normalizeDistrictName(place.district));
    const resolvedDistrict = districtName ?? getNearestDistrictName(place, districtCenters);

    return resolvedDistrict && resolvedDistrict !== place.district
      ? { ...place, district: resolvedDistrict }
      : place;
  });
}
