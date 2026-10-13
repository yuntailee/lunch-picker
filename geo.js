export const SEARCH_RADIUS_M = 800;
const EARTH_RADIUS_M = 6_371_000;
const WALK_METERS_PER_MINUTE = 80;

const METERS_PER_DEGREE_LAT = 111_320;

export function distanceMeters(from, to) {
  if (![from?.lat, from?.lng, to?.lat, to?.lng].every(Number.isFinite)) return null;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function formatDistance(meters) {
  if (meters == null) return "";
  const minutes = meters === 0 ? 0 : Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE));
  return `${meters}公尺 · ${minutes}分鐘`;
}

export function boundsAround({ lat, lng }, radiusMeters) {
  const dLat = radiusMeters / METERS_PER_DEGREE_LAT;
  const dLng = radiusMeters / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  return { north: lat + dLat, south: lat - dLat, east: lng + dLng, west: lng - dLng };
}
