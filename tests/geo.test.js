import assert from "node:assert/strict";
import { test } from "node:test";

import { boundsAround } from "../geo.js";

test("boundsAround 以中心點往外擴出指定公尺的矩形", () => {
  const bounds = boundsAround({ lat: 25, lng: 121.5 }, 1113.2);
  assert.ok(Math.abs(bounds.north - 25.01) < 1e-9);
  assert.ok(Math.abs(bounds.south - 24.99) < 1e-9);
  assert.ok(bounds.east > 121.51, "緯度 25 度時經度方向的度數要比緯度多");
  assert.ok(Math.abs(bounds.east - 121.5 - (121.5 - bounds.west)) < 1e-9);
});
