import assert from "node:assert/strict";
import { test } from "node:test";

import {
  filterByPrice,
  filterByTag,
  formatPrice,
  formatRating,
  pickRandom,
  priceBucket,
  summaryHighlight,
  toPrice,
} from "../recommender.js";

test("summaryHighlight 只取評論摘要第一段", () => {
  assert.equal(summaryHighlight("招牌肉燥麵很好吃。\n\n部分評論提到很擠。"), "招牌肉燥麵很好吃。");
  assert.equal(summaryHighlight(undefined), "");
});

const restaurants = [
  { name: "雞肉飯", tags: ["飯"], price: { start: 1, end: 200 } },
  { name: "牛肉麵", tags: ["麵"], price: { start: 200, end: 400 } },
  { name: "咖哩飯", tags: ["飯", "日式"], price: { start: 1000, end: null } },
  { name: "神秘小館", tags: ["其他"], price: null },
];

test("filterByTag 只留下有該類型的餐廳", () => {
  assert.deepEqual(
    filterByTag(restaurants, "飯").map((r) => r.name),
    ["雞肉飯", "咖哩飯"],
  );
});

test("filterByTag 沒給類型時回傳全部", () => {
  assert.equal(filterByTag(restaurants, null).length, 4);
});

test("toPrice 把 Google priceRange 轉成數字，沒有上限時 end 為 null", () => {
  assert.deepEqual(toPrice({ startPrice: { units: "1" }, endPrice: { units: "200" } }), { start: 1, end: 200 });
  assert.deepEqual(toPrice({ startPrice: { units: 1000 } }), { start: 1000, end: null });
  assert.equal(toPrice(undefined), null);
});

test("priceBucket 依價格上限分級", () => {
  assert.equal(priceBucket({ start: 1, end: 200 }), "$200 以下");
  assert.equal(priceBucket({ start: 200, end: 400 }), "$200–400");
  assert.equal(priceBucket({ start: 400, end: 600 }), "$400 以上");
  assert.equal(priceBucket({ start: 1000, end: null }), "$400 以上");
  assert.equal(priceBucket(null), null);
});

test("filterByPrice 篩選時排除沒有價格的店，不篩選時全部保留", () => {
  assert.deepEqual(filterByPrice(restaurants, "$200 以下").map((r) => r.name), ["雞肉飯"]);
  assert.deepEqual(filterByPrice(restaurants, "$400 以上").map((r) => r.name), ["咖哩飯"]);
  assert.equal(filterByPrice(restaurants, null).length, 4);
});

test("formatPrice 與 formatRating 的顯示格式", () => {
  assert.equal(formatPrice({ start: 1, end: 200 }), "$1–200");
  assert.equal(formatPrice({ start: 1000, end: null }), "$1000 以上");
  assert.equal(formatPrice(null), "");
  assert.equal(formatRating(4.25, 1234), "⭐ 4.3（1,234）");
  assert.equal(formatRating(null, 0), "");
});

test("pickRandom 依亂數選出對應項目", () => {
  assert.equal(pickRandom(restaurants, () => 0).name, "雞肉飯");
  assert.equal(pickRandom(restaurants, () => 0.99).name, "神秘小館");
});

test("pickRandom 空清單回傳 null", () => {
  assert.equal(pickRandom([]), null);
});
