import { boundsAround, SEARCH_RADIUS_M } from "./geo.js";

const MAPS_CALLBACK = "__foodToolMapsReady";
const CACHE_TTL_MS = 30 * 60 * 1000;
// rating / userRatingCount 屬於 Text Search Enterprise SKU（每月免費額度約 1,000 次）
const FIELDS = ["displayName", "formattedAddress", "googleMapsURI", "rating", "userRatingCount"];

let mapsReady;

function loadMaps(apiKey) {
  mapsReady ??= new Promise((resolve, reject) => {
    window[MAPS_CALLBACK] = resolve;
    const params = new URLSearchParams({
      key: apiKey,
      loading: "async",
      language: "zh-TW",
      region: "TW",
      callback: MAPS_CALLBACK,
    });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.onerror = () => {
      mapsReady = undefined;
      reject(new Error("無法載入 Google Maps"));
    };
    document.head.append(script);
  });
  return mapsReady;
}

export function toCandidate(place) {
  const detail = place.rating
    ? `⭐ ${place.rating.toFixed(1)}（${(place.userRatingCount ?? 0).toLocaleString()} 則評論）`
    : "尚無評分";
  return {
    name: place.displayName,
    detail,
    address: place.formattedAddress ?? "",
    mapUrl: place.googleMapsURI,
  };
}

export async function searchNearby({ apiKey, location, keyword }) {
  const cacheKey = `food-tool:explore:${location.name}:${keyword}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null");
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.results;

  await loadMaps(apiKey);
  const { Place } = await google.maps.importLibrary("places");
  const { places } = await Place.searchByText({
    textQuery: keyword,
    fields: FIELDS,
    includedType: "restaurant",
    isOpenNow: true,
    locationRestriction: boundsAround(location, SEARCH_RADIUS_M),
    maxResultCount: 20,
  });

  const results = places.map(toCandidate);
  localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), results }));
  return results;
}
