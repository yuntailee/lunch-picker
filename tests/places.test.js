import assert from "node:assert/strict";
import { test } from "node:test";

import { boundsAround, toCandidate } from "../places.js";

test("boundsAround 以中心點往外擴出指定公尺的矩形", () => {
  const bounds = boundsAround({ lat: 25, lng: 121.5 }, 1113.2);
  assert.ok(Math.abs(bounds.north - 25.01) < 1e-9);
  assert.ok(Math.abs(bounds.south - 24.99) < 1e-9);
  assert.ok(bounds.east > 121.51, "緯度 25 度時經度方向的度數要比緯度多");
  assert.ok(Math.abs(bounds.east - 121.5 - (121.5 - bounds.west)) < 1e-9);
});

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
