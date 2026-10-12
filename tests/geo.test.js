import assert from "node:assert/strict";
import { test } from "node:test";

import { boundsAround, splitBounds } from "../geo.js";

test("boundsAround 以中心點往外擴出指定公尺的矩形", () => {
  const bounds = boundsAround({ lat: 25, lng: 121.5 }, 1113.2);
  assert.ok(Math.abs(bounds.north - 25.01) < 1e-9);
  assert.ok(Math.abs(bounds.south - 24.99) < 1e-9);
  assert.ok(bounds.east > 121.51, "緯度 25 度時經度方向的度數要比緯度多");
  assert.ok(Math.abs(bounds.east - 121.5 - (121.5 - bounds.west)) < 1e-9);
});

test("splitBounds 把矩形切成四個蓋滿原範圍的格子", () => {
  const parts = splitBounds({ north: 2, south: 0, east: 4, west: 0 });
  assert.equal(parts.length, 4);
  assert.deepEqual(
    parts.map((part) => [part.south, part.north, part.west, part.east]),
    [
      [0, 1, 0, 2],
      [0, 1, 2, 4],
      [1, 2, 0, 2],
      [1, 2, 2, 4],
    ],
  );
});
