import { boundsAround, SEARCH_RADIUS_M } from "./geo.js";
import { lunchDays } from "./hours.js";
import { formatPrice, formatRating, summaryHighlight, toPrice } from "./recommender.js";

const MAPS_CALLBACK = "__foodToolMapsReady";
const CACHE_TTL_MS = 30 * 60 * 1000;
// reviewSummary 屬於 Enterprise + Atmosphere SKU（每月免費 1,000 次，與每週爬蟲共用）
const FIELDS = [
  "displayName",
  "formattedAddress",
  "googleMapsURI",
  "rating",
  "userRatingCount",
  "priceRange",
  "regularOpeningHours",
  "reviewSummary",
];

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
  const price = toPrice(place.priceRange);
  return {
    placeId: place.id,
    name: place.displayName,
    detail: formatPrice(price),
    rating: formatRating(place.rating, place.userRatingCount),
    address: place.formattedAddress ?? "",
    mapUrl: place.googleMapsURI,
    price,
    lunchDays: lunchDays(place.regularOpeningHours?.periods),
    summary: summaryHighlight(place.reviewSummary?.text),
  };
}

export async function searchNearby({ apiKey, location, keyword }) {
  const cacheKey = `food-tool:places:${location.name}:${keyword}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null");
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.results;

  await loadMaps(apiKey);
  const { Place } = await google.maps.importLibrary("places");
  const { places } = await Place.searchByText({
    textQuery: keyword,
    fields: FIELDS,
    includedType: "restaurant",
    locationRestriction: boundsAround(location, SEARCH_RADIUS_M),
    maxResultCount: 20,
  });

  const results = places.map(toCandidate);
  localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), results }));
  return results;
}
