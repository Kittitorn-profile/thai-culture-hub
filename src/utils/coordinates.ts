/** Parse only explicit numeric coordinates; missing values must never become zero. */
export function parseCoordinate(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))
    return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
export function isValidCoordinatePair(lat: unknown, lng: unknown) {
  const latitude = parseCoordinate(lat);
  const longitude = parseCoordinate(lng);
  return (
    latitude !== null &&
    longitude !== null &&
    latitude !== 0 &&
    longitude !== 0 &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}
