import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { filterByTag, mapUrl, pickRandom, tagsOf } from "../recommender.js";

const restaurants = [
  { name: "雞肉飯", tags: ["飯"] },
  { name: "牛肉麵", tags: ["麵"] },
  { name: "咖哩飯", tags: ["飯", "日式"] },
];

test("tagsOf 回傳不重複的類型並保留順序", () => {
  assert.deepEqual(tagsOf(restaurants), ["飯", "麵", "日式"]);
});

test("filterByTag 只留下有該類型的餐廳", () => {
  assert.deepEqual(
    filterByTag(restaurants, "飯").map((r) => r.name),
    ["雞肉飯", "咖哩飯"],
  );
});

test("filterByTag 沒給類型時回傳全部", () => {
  assert.equal(filterByTag(restaurants, null).length, 3);
});

test("pickRandom 依亂數選出對應項目", () => {
  assert.equal(pickRandom(restaurants, () => 0).name, "雞肉飯");
  assert.equal(pickRandom(restaurants, () => 0.99).name, "咖哩飯");
});

test("pickRandom 空清單回傳 null", () => {
  assert.equal(pickRandom([]), null);
});

test("mapUrl 用店名加地區組出 Google 地圖搜尋網址", () => {
  assert.equal(
    mapUrl({ name: "雞肉飯" }, "內湖"),
    "https://www.google.com/maps/search/?api=1&query=%E9%9B%9E%E8%82%89%E9%A3%AF%20%E5%85%A7%E6%B9%96",
  );
});

test("data/restaurants.json 格式正確", async () => {
  const url = new URL("../data/restaurants.json", import.meta.url);
  const { locations } = JSON.parse(await readFile(url, "utf-8"));
  assert.ok(locations.length > 0, "至少要有一個地點");
  for (const location of locations) {
    assert.equal(typeof location.name, "string");
    assert.equal(typeof location.area, "string");
    assert.equal(typeof location.lat, "number", `${location.name} 缺少 lat`);
    assert.equal(typeof location.lng, "number", `${location.name} 缺少 lng`);
    assert.ok(location.restaurants.length > 0, `${location.name} 沒有餐廳`);
    for (const r of location.restaurants) {
      assert.equal(typeof r.name, "string");
      assert.ok(Array.isArray(r.tags) && r.tags.length > 0, `${r.name} 缺少 tags`);
    }
  }
});
