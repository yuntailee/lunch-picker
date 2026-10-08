import assert from "node:assert/strict";
import { test } from "node:test";

import { toCandidate } from "../places.js";

test("toCandidate 轉出店名、評分、價格、地址與 Google 地圖網址", () => {
  const candidate = toCandidate({
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
    name: "阿嬤雞肉飯",
    detail: "⭐ 4.3（1,234） · $1–200",
    address: "台北市內湖區某路 1 號",
    mapUrl: "https://maps.google.com/?cid=1",
    price: { start: 1, end: 200 },
    lunchDays: [1],
    summary: "招牌雞肉飯很香。",
  });
});

test("toCandidate 沒有評分、價格與營業時間時給預設值", () => {
  const candidate = toCandidate({ displayName: "新店", googleMapsURI: "x" });
  assert.equal(candidate.detail, "尚無評分");
  assert.equal(candidate.price, null);
  assert.deepEqual(candidate.lunchDays, []);
  assert.equal(candidate.summary, "");
});
