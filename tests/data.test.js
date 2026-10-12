import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { GROUPS, locationsForGroup } from "../members.js";

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
    assert.ok(GROUPS.includes(location.group), `${location.name} 的 group 不是已知群組`);
  }
});

test("群組只拿到自己的地點", async () => {
  const config = await readJson("../data/config.json");
  const { locations } = await readJson("../data/restaurants.json");
  assert.deepEqual(
    locationsForGroup(config.locations, locations, "仁愛醫院", config.categories).map((l) => l.name),
    ["仁愛醫院"],
  );
  assert.deepEqual(locationsForGroup(config.locations, locations, "公司").map((l) => l.name), ["內湖", "板橋 TPKC"]);
});

test("data/closed.json 的歇業店有編號、名稱和歇業種類", async () => {
  const closed = await readJson("../data/closed.json");
  assert.ok(Array.isArray(closed));
  for (const restaurant of closed) {
    assert.ok(restaurant.placeId && restaurant.name, "歇業店缺少 placeId 或名稱");
    assert.ok(restaurant.detail === "永久歇業" || restaurant.detail === "暫停營業");
  }
});

test("data/restaurants.json 是完整的爬蟲結果", async () => {
  const { updatedAt, locations } = await readJson("../data/restaurants.json");
  const config = await readJson("../data/config.json");
  assert.ok(!Number.isNaN(Date.parse(updatedAt)), "updatedAt 必須是日期");
  const crawledNames = locations.map((l) => l.name);
  assert.deepEqual(
    crawledNames,
    config.locations.map((l) => l.name).filter((name) => crawledNames.includes(name)),
    "已爬過的地點要照 config.json 的順序；還沒爬的地點只做即時搜尋",
  );
  for (const location of locations) {
    assert.ok(location.restaurants.length > 0, `${location.name} 沒有餐廳`);
    for (const r of location.restaurants) {
      assert.ok(r.placeId && r.name && r.mapUrl, `${location.name} 有餐廳缺少 placeId、名稱或網址`);
      assert.ok(r.tags.length > 0 && r.tags.every((t) => location.tags.includes(t)), `${r.name} 的分類不在 tags 內`);
      assert.ok(typeof r.gist === "string" && Array.isArray(r.dishes), `${r.name} 缺少 gist 或 dishes`);
    }
  }
});
