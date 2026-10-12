export const SEARCH_RADIUS_M = 1000;

const METERS_PER_DEGREE_LAT = 111_320;

export function boundsAround({ lat, lng }, radiusMeters) {
  const dLat = radiusMeters / METERS_PER_DEGREE_LAT;
  const dLng = radiusMeters / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  return { north: lat + dLat, south: lat - dLat, east: lng + dLng, west: lng - dLng };
}

export function splitBounds({ north, south, east, west }) {
  const midLat = (north + south) / 2;
  const midLng = (east + west) / 2;
  return [
    { north: midLat, south, east: midLng, west },
    { north: midLat, south, east, west: midLng },
    { north, south: midLat, east: midLng, west },
    { north, south: midLat, east, west: midLng },
  ];
}
