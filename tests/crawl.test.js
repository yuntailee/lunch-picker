import assert from "node:assert/strict";
import { test } from "node:test";

import { applyCondensed, buildLocation, buildRestaurants, OTHER_TAG } from "../scripts/crawl.js";

test("applyCondensed 把濃縮結果依序套到有摘要的店，並移除原始摘要", () => {
  const restaurants = applyCondensed(
    [
      { name: "A", summary: "原文 A" },
      { name: "B", summary: "" },
      { name: "C", summary: "原文 C" },
    ],
    [
      { gist: "重點 A", dishes: ["菜 A"] },
      { gist: "重點 C", dishes: [] },
    ],
  );
  assert.deepEqual(restaurants, [
    { name: "A", gist: "重點 A", dishes: ["菜 A"] },
    { name: "B", gist: "", dishes: [] },
    { name: "C", gist: "重點 C", dishes: [] },
  ]);
});

const place = (id, name, businessStatus = "OPERATIONAL") => ({
  id,
  displayName: { text: name },
  shortFormattedAddress: `${name}路 1 號`,
  googleMapsUri: `https://maps.google.com/?cid=${id}`,
  businessStatus,
  priceRange: { startPrice: { units: "1" }, endPrice: { units: "200" } },
  rating: 4.2,
  userRatingCount: 88,
  reviewSummary: { text: { text: `${name}的招牌菜很受歡迎。\n\n部分評論提到等很久。` } },
});

test("buildRestaurants 保留價格、評分與評論摘要第一段", () => {
  const [restaurant] = buildRestaurants([{ category: "飯", places: [place("1", "雞肉飯")] }]);
  assert.deepEqual(restaurant.price, { start: 1, end: 200 });
  assert.equal(restaurant.rating, 4.2);
  assert.equal(restaurant.ratingCount, 88);
  assert.equal(restaurant.summary, "雞肉飯的招牌菜很受歡迎。");
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
