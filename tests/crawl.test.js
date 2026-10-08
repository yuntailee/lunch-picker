import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLocation, buildRestaurants, OTHER_TAG } from "../scripts/crawl.js";

const place = (id, name, businessStatus = "OPERATIONAL") => ({
  id,
  displayName: { text: name },
  shortFormattedAddress: `${name}路 1 號`,
  googleMapsUri: `https://maps.google.com/?cid=${id}`,
  businessStatus,
});

test("buildRestaurants 依搜尋分類歸類並合併重複店家", () => {
  const restaurants = buildRestaurants([
    { category: "飯", places: [place("1", "咖哩飯"), place("2", "雞肉飯")] },
    { category: "日式", places: [place("1", "咖哩飯")] },
  ]);
  assert.deepEqual(
    restaurants.map((r) => [r.name, r.tags]),
    [
      ["咖哩飯", ["飯", "日式"]],
      ["雞肉飯", ["飯"]],
    ],
  );
  assert.equal(restaurants[0].mapUrl, "https://maps.google.com/?cid=1");
});

test("buildRestaurants 排除歇業店家", () => {
  const restaurants = buildRestaurants([
    { category: "飯", places: [place("1", "倒閉飯館", "CLOSED_PERMANENTLY")] },
  ]);
  assert.equal(restaurants.length, 0);
});

test("只在通用搜尋出現的店家歸類為其他", () => {
  const restaurants = buildRestaurants([
    { category: "飯", places: [place("1", "雞肉飯")] },
    { category: null, places: [place("1", "雞肉飯"), place("2", "神秘小館")] },
  ]);
  assert.deepEqual(restaurants.find((r) => r.name === "神秘小館").tags, [OTHER_TAG]);
  assert.deepEqual(restaurants.find((r) => r.name === "雞肉飯").tags, ["飯"]);
});

test("buildLocation 只列出有店家的分類並保留設定順序", () => {
  const location = buildLocation({ name: "公司" }, ["飯", "麵", "日式"], [
    { category: "日式", places: [place("1", "拉麵")] },
    { category: "飯", places: [place("2", "雞肉飯")] },
  ]);
  assert.deepEqual(location.tags, ["飯", "日式"]);
  assert.equal(location.name, "公司");
});
