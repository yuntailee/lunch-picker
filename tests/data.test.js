import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf-8"));

test("data/config.json 格式正確", async () => {
  const { categories, locations } = await readJson("../data/config.json");
  assert.ok(categories.length > 0, "至少要有一個分類");
  assert.ok(locations.length > 0, "至少要有一個地點");
  for (const location of locations) {
    assert.equal(typeof location.name, "string");
    assert.equal(typeof location.area, "string");
    assert.equal(typeof location.lat, "number", `${location.name} 缺少 lat`);
    assert.equal(typeof location.lng, "number", `${location.name} 缺少 lng`);
  }
});

test("data/restaurants.json 是完整的爬蟲結果", async () => {
  const { updatedAt, locations } = await readJson("../data/restaurants.json");
  const config = await readJson("../data/config.json");
  assert.ok(!Number.isNaN(Date.parse(updatedAt)), "updatedAt 必須是日期");
  assert.deepEqual(
    locations.map((l) => l.name),
    config.locations.map((l) => l.name),
    "地點要和 config.json 一致，改了 config.json 要重新跑 npm run crawl",
  );
  for (const location of locations) {
    assert.ok(location.restaurants.length > 0, `${location.name} 沒有餐廳`);
    for (const r of location.restaurants) {
      assert.ok(r.name && r.mapUrl, `${location.name} 有餐廳缺少名稱或網址`);
      assert.ok(r.tags.length > 0 && r.tags.every((t) => location.tags.includes(t)), `${r.name} 的分類不在 tags 內`);
    }
  }
});
