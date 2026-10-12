import assert from "node:assert/strict";
import { test } from "node:test";

import { gatherTextSearch, searchArea, toCandidate } from "../places.js";

test("toCandidate 轉出店名、評分、價格、地址與 Google 地圖網址", () => {
  const candidate = toCandidate({
    id: "ChIJ-abc",
    displayName: "阿嬤雞肉飯",
    rating: 4.25,
    userRatingCount: 1234,
    priceRange: { startPrice: { units: 1 }, endPrice: { units: 200 } },
    formattedAddress: "台北市內湖區某路 1 號",
    googleMapsURI: "https://maps.google.com/?cid=1",
    regularOpeningHours: {
      periods: [{ open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 14, minute: 0 } }],
    },
    reviewSummary: { text: "招牌雞肉飯很香。\n\n部分評論提到排隊很久。" },
  });
  assert.deepEqual(candidate, {
    placeId: "ChIJ-abc",
    name: "阿嬤雞肉飯",
    detail: "$1–200",
    rating: "4.3（1,234）",
    address: "台北市內湖區某路 1 號",
    mapUrl: "https://maps.google.com/?cid=1",
    price: { start: 1, end: 200 },
    summary: "招牌雞肉飯很香。",
  });
});

test("gatherTextSearch 翻頁直到沒有下一頁，最多 3 頁", async () => {
  const calls = [];
  const { places, truncated } = await gatherTextSearch(async (pageToken) => {
    calls.push(pageToken);
    const page = calls.length;
    return { places: [{ id: `p${page}` }], nextPageToken: page < 3 ? `token-${page}` : undefined };
  });
  assert.deepEqual(calls, [undefined, "token-1", "token-2"]);
  assert.equal(truncated, false);
  assert.deepEqual(places.map((place) => place.id), ["p1", "p2", "p3"]);
});

test("gatherTextSearch 第 3 頁還有下一頁時標記為被截斷", async () => {
  const { truncated } = await gatherTextSearch(async () => ({
    places: [{ id: "p" }],
    nextPageToken: "more",
  }));
  assert.equal(truncated, true);
});

test("gatherTextSearch 第一頁就沒有下一頁時停住", async () => {
  let calls = 0;
  const { places, truncated } = await gatherTextSearch(async () => {
    calls += 1;
    return { places: [{ id: "only" }] };
  });
  assert.equal(calls, 1);
  assert.equal(truncated, false);
  assert.deepEqual(places, [{ id: "only" }]);
});

test("searchArea 這一格沒滿就不再切", async () => {
  let calls = 0;
  const places = await searchArea(async () => {
    calls += 1;
    return { places: [{ id: "a" }], truncated: false };
  }, box());
  assert.equal(calls, 1);
  assert.deepEqual(places, [{ id: "a" }]);
});

test("searchArea 這一格滿了就切成四格，同一間店只留一筆", async () => {
  let calls = 0;
  const places = await searchArea(async () => {
    calls += 1;
    if (calls === 1) return { places: [{ id: "top" }], truncated: true };
    return { places: [{ id: `q${calls}` }, { id: "top" }], truncated: false };
  }, box());
  assert.equal(calls, 5);
  assert.deepEqual(
    places.map((place) => place.id).sort(),
    ["q2", "q3", "q4", "q5", "top"],
  );
});

test("searchArea 四格共用同一份查詢次數", async () => {
  let calls = 0;
  await searchArea(
    async () => {
      calls += 1;
      return { places: [{ id: `p${calls}` }], truncated: true };
    },
    box(),
    0,
    { remaining: 2 },
  );
  assert.equal(calls, 2);
});

test("searchArea 查詢次數用完就停", async () => {
  let calls = 0;
  const places = await searchArea(
    async () => {
      calls += 1;
      return { places: [{ id: `p${calls}` }], truncated: true };
    },
    box(),
    0,
    { remaining: 1 },
  );
  assert.equal(calls, 1);
  assert.deepEqual(places, [{ id: "p1" }]);
});

function box() {
  return { north: 2, south: 0, east: 2, west: 0 };
}

test("toCandidate 沒有評分、價格與營業時間時給空值", () => {
  const candidate = toCandidate({ displayName: "新店", googleMapsURI: "x" });
  assert.equal(candidate.detail, "");
  assert.equal(candidate.rating, "");
  assert.equal(candidate.price, null);
  assert.equal(candidate.summary, "");
});
