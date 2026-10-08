import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCondensed, toBatches } from "../scripts/condense.js";

test("toBatches 依大小切批，最後一批可以不滿", () => {
  assert.deepEqual(toBatches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(toBatches([], 2), []);
});

test("parseCondensed 依 id 對回原順序，缺漏的補空值，菜名最多 4 個", () => {
  const json = JSON.stringify([
    { id: 1, dishes: ["牛肉麵"], gist: "湯頭濃郁" },
    { id: 0, dishes: ["a", "b", "c", "d", "e"], gist: "份量大" },
  ]);
  assert.deepEqual(parseCondensed(json, 3), [
    { gist: "份量大", dishes: ["a", "b", "c", "d"] },
    { gist: "湯頭濃郁", dishes: ["牛肉麵"] },
    { gist: "", dishes: [] },
  ]);
});
