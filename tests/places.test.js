import assert from "node:assert/strict";
import { test } from "node:test";

import { toCandidate } from "../places.js";

test("toCandidate 轉出店名、評分、地址與 Google 地圖網址", () => {
  const candidate = toCandidate({
    displayName: "阿嬤雞肉飯",
    rating: 4.25,
    userRatingCount: 1234,
    formattedAddress: "台北市內湖區某路 1 號",
    googleMapsURI: "https://maps.google.com/?cid=1",
  });
  assert.deepEqual(candidate, {
    name: "阿嬤雞肉飯",
    detail: "⭐ 4.3（1,234 則評論）",
    address: "台北市內湖區某路 1 號",
    mapUrl: "https://maps.google.com/?cid=1",
  });
});

test("toCandidate 沒有評分時顯示尚無評分", () => {
  assert.equal(toCandidate({ displayName: "新店", googleMapsURI: "x" }).detail, "尚無評分");
});
