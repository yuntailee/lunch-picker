import assert from "node:assert/strict";
import { test } from "node:test";

import { boundsAround, distanceMeters, formatDistance } from "../geo.js";

test("boundsAround 以中心點往外擴出指定公尺的矩形", () => {
  const bounds = boundsAround({ lat: 25, lng: 121.5 }, 1113.2);
  assert.ok(Math.abs(bounds.north - 25.01) < 1e-9);
  assert.ok(Math.abs(bounds.south - 24.99) < 1e-9);
  assert.ok(bounds.east > 121.51, "緯度 25 度時經度方向的度數要比緯度多");
  assert.ok(Math.abs(bounds.east - 121.5 - (121.5 - bounds.west)) < 1e-9);
});

test("distanceMeters 算兩點直線距離，缺座標就沒有距離", () => {
  const origin = { lat: 25, lng: 121.5 };
  const north = { lat: 25 + 800 / ((6_371_000 * Math.PI) / 180), lng: 121.5 };
  assert.equal(distanceMeters(origin, north), 800);
  assert.equal(distanceMeters(origin, origin), 0);
  assert.equal(distanceMeters(origin, {}), null);
});

test("formatDistance 收成一百公尺，並以每分鐘 80 公尺估走路時間", () => {
  assert.equal(formatDistance(740), "700公尺 · 9分鐘");
  assert.equal(formatDistance(150), "200公尺 · 3分鐘");
  assert.equal(formatDistance(50), "100公尺 · 1分鐘");
  assert.equal(formatDistance(null), "");
});
