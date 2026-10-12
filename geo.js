export const SEARCH_RADIUS_M = 800;

const METERS_PER_DEGREE_LAT = 111_320;

export function boundsAround({ lat, lng }, radiusMeters) {
  const dLat = radiusMeters / METERS_PER_DEGREE_LAT;
  const dLng = radiusMeters / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  return { north: lat + dLat, south: lat - dLat, east: lng + dLng, west: lng - dLng };
}
