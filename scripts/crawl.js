import { readFile, writeFile } from "node:fs/promises";

import { boundsAround, SEARCH_RADIUS_M } from "../geo.js";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
// 只用 Pro SKU 欄位（每月免費 5,000 次）；加 rating 會升級成 Enterprise SKU
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.shortFormattedAddress",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");
// Text Search (New) 每個查詢最多回傳 3 頁、共 60 筆
const MAX_PAGES = 3;
const GENERIC_QUERY = "餐廳";
export const OTHER_TAG = "其他";

const CONFIG_PATH = new URL("../data/config.json", import.meta.url);
const OUTPUT_PATH = new URL("../data/restaurants.json", import.meta.url);

async function searchAll(apiKey, location, query) {
  const { north, south, east, west } = boundsAround(location, SEARCH_RADIUS_M);
  const places = [];
  let pageToken;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        includedType: "restaurant",
        locationRestriction: {
          rectangle: {
            low: { latitude: south, longitude: west },
            high: { latitude: north, longitude: east },
          },
        },
        languageCode: "zh-TW",
        regionCode: "TW",
        pageSize: 20,
        pageToken,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`搜尋「${query}」失敗：${data.error?.message ?? response.status}`);
    }
    places.push(...(data.places ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return places;
}

export function buildRestaurants(hits) {
  const byId = new Map();
  for (const { category, places } of hits) {
    for (const place of places) {
      if (place.businessStatus && place.businessStatus !== "OPERATIONAL") continue;
      const entry = byId.get(place.id) ?? {
        name: place.displayName.text,
        tags: [],
        address: place.shortFormattedAddress ?? "",
        mapUrl: place.googleMapsUri,
      };
      if (category && !entry.tags.includes(category)) entry.tags.push(category);
      byId.set(place.id, entry);
    }
  }
  return [...byId.values()]
    .map((r) => (r.tags.length ? r : { ...r, tags: [OTHER_TAG] }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

export function buildLocation(location, categories, hits) {
  const restaurants = buildRestaurants(hits);
  const tags = [...categories, OTHER_TAG].filter((tag) => restaurants.some((r) => r.tags.includes(tag)));
  return { ...location, tags, restaurants };
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY;
  if (!apiKey) throw new Error("缺少環境變數 GOOGLE_PLACES_SERVER_KEY");

  const { categories, locations } = JSON.parse(await readFile(CONFIG_PATH, "utf-8"));
  const output = { updatedAt: new Date().toISOString(), locations: [] };

  for (const location of locations) {
    const hits = [];
    for (const category of [...categories, null]) {
      hits.push({ category, places: await searchAll(apiKey, location, category ?? GENERIC_QUERY) });
    }
    const built = buildLocation(location, categories, hits);
    console.log(`${location.name}：${built.restaurants.length} 間`);
    output.locations.push(built);
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
}

if (import.meta.main) await main();
