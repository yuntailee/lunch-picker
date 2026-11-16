import assert from "node:assert/strict";
import { test } from "node:test";

import { condenseSummaries, isRetryableStatus, parseCondensed, retryDelayMs, toBatches } from "../scripts/condense.js";

test("toBatches 依大小切批，最後一批可以不滿", () => {
  assert.deepEqual(toBatches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(toBatches([], 2), []);
});

test("只有暫時性的 Gemini 狀態碼才重試", () => {
  for (const status of [429, 500, 502, 503, 504]) assert.equal(isRetryableStatus(status), true);
  for (const status of [400, 401, 403, 404]) assert.equal(isRetryableStatus(status), false);
});

test("重試等待指數成長，有 Retry-After 就以它為準", () => {
  assert.equal(retryDelayMs(1), 3_000);
  assert.equal(retryDelayMs(2), 6_000);
  assert.equal(retryDelayMs(5), 48_000);
  assert.equal(retryDelayMs(6), 60_000);
  assert.equal(retryDelayMs(1, "2"), 2_000);
  assert.equal(retryDelayMs(1, "300"), 120_000);
  assert.equal(retryDelayMs(2, "abc"), 6_000);
  assert.equal(retryDelayMs(2, "0"), 6_000);
});

function condensedResponse(status, body, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

test("503 會再打一次，400 不會重試", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  console.warn = () => {};
  t.after(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  });

  const success = {
    candidates: [{ content: { parts: [{ text: JSON.stringify([{ id: 0, dishes: ["肉燥麵"], gist: "湯濃" }]) }] } }],
  };
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return condensedResponse(503, { error: { message: "high demand" } }, { "retry-after": "0.001" });
    }
    return condensedResponse(200, success);
  };
  assert.deepEqual(await condenseSummaries("key", ["牛肉麵很好吃"]), [{ gist: "湯濃", dishes: ["肉燥麵"] }]);
  assert.equal(calls, 2);

  calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return condensedResponse(400, { error: { message: "bad request" } });
  };
  await assert.rejects(() => condenseSummaries("key", ["x"]), /Gemini 濃縮失敗：bad request/);
  assert.equal(calls, 1);
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
