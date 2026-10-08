import assert from "node:assert/strict";
import { test } from "node:test";

import { filterByTag, pickRandom } from "../recommender.js";

const restaurants = [
  { name: "雞肉飯", tags: ["飯"] },
  { name: "牛肉麵", tags: ["麵"] },
  { name: "咖哩飯", tags: ["飯", "日式"] },
];

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
