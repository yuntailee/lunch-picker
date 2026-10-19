import { boundsAround, SEARCH_RADIUS_M } from "./geo.js";
import { formatPrice, formatRating, summaryHighlight, toPrice } from "./recommender.js";

const MAPS_CALLBACK = "__foodToolMapsReady";
const CACHE_TTL_MS = 30 * 60 * 1000;
const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PAGE_SIZE = 20;
export const TEXT_SEARCH_PAGES = 3;
// reviewSummary 屬於 Enterprise + Atmosphere SKU（每月免費 1,000 次，與每週爬蟲共用）
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.googleMapsUri",
  "places.location",
  "places.businessStatus",
  "places.rating",
  "places.userRatingCount",
  "places.priceRange",
  "places.reviewSummary",
  "nextPageToken",
].join(",");

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
    lat: place.lat ?? place.location?.latitude ?? null,
    lng: place.lng ?? place.location?.longitude ?? null,
    price,
    summary: summaryHighlight(place.reviewSummary?.text),
  };
}

export async function geocode({ apiKey, query }) {
  await loadMaps(apiKey);
  const { Place } = await google.maps.importLibrary("places");
  const { places } = await Place.searchByText({ textQuery: query, fields: ["location"], maxResultCount: 1 });
  if (!places.length) throw new Error(`找不到「${query}」`);
  return { name: query, lat: places[0].location.lat(), lng: places[0].location.lng() };
}

const CLOSED_STATUSES = new Set(["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"]);

export function closedLabel(businessStatus) {
  return businessStatus === "CLOSED_TEMPORARILY" ? "暫停營業" : "永久歇業";
}

export function partitionPlaces(places) {
  const open = [];
  const closed = [];
  for (const place of places) {
    if (CLOSED_STATUSES.has(place.businessStatus)) closed.push(place);
    else open.push(place);
  }
  return { open, closed };
}

export async function gatherTextSearch(fetchPage) {
  const places = [];
  let pageToken;
  for (let page = 0; page < TEXT_SEARCH_PAGES; page += 1) {
    const data = await fetchPage(pageToken);
    places.push(...(data.places ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return places;
}

export function describeSearchError(message, status) {
  if ((message ?? "").includes("Quota exceeded")) {
    return "今天的 Google 搜尋次數用完了，明天 15:00 後再試";
  }
  return `Google 搜尋失敗：${message ?? status}`;
}

function fromRestPlace(place) {
  const summary = place.reviewSummary?.text;
  return {
    id: place.id?.replace(/^places\//, ""),
    displayName: place.displayName?.text ?? place.displayName,
    formattedAddress: place.formattedAddress,
    googleMapsURI: place.googleMapsUri,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceRange: place.priceRange,
    reviewSummary: { text: summary?.text ?? summary ?? "" },
  };
}

function rectangleBody(keyword, bounds) {
  return {
    textQuery: keyword,
    includedType: "restaurant",
    locationRestriction: {
      rectangle: {
        low: { latitude: bounds.south, longitude: bounds.west },
        high: { latitude: bounds.north, longitude: bounds.east },
      },
    },
    languageCode: "zh-TW",
    regionCode: "TW",
    pageSize: PAGE_SIZE,
    rankPreference: "DISTANCE",
  };
}

async function fetchTextPage(apiKey, body, pageToken) {
  const response = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ ...body, pageToken }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(describeSearchError(data.error?.message, response.status));
  return data;
}

// 一次按鈕先抓 1 公里，畫面上再自己把最遠距離縮短。
// 把地圖切成多格再查，會把 SearchTextRequest 的每日配額打完。
export async function searchNearby({ apiKey, location, keyword }) {
  const cacheKey = `food-tool:places:${location.lat},${location.lng}:${keyword}:walk:${SEARCH_RADIUS_M}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null");
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return { results: cached.results, closed: cached.closed ?? [] };
  }

  const bounds = boundsAround(location, SEARCH_RADIUS_M);
  const places = await gatherTextSearch((pageToken) =>
    fetchTextPage(apiKey, rectangleBody(keyword, bounds), pageToken),
  );

  const { open, closed } = partitionPlaces(places);
  const payload = {
    results: open.map(fromRestPlace).map(toCandidate),
    closed: closed.map(toClosedCandidate),
  };
  localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), ...payload }));
  return payload;
}

function toClosedCandidate(place) {
  return { ...toCandidate(fromRestPlace(place)), detail: closedLabel(place.businessStatus), summary: "" };
}
