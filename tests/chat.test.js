import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSystemPrompt } from "../chat.js";

test("buildSystemPrompt 把目前條件與每間餐廳壓成一行放進提示", () => {
  const prompt = buildSystemPrompt({
    summary: "內湖，週四 11:30–13:00 有開、「麵」共 2 間",
    candidates: [
      {
        name: "八時牛堂",
        detail: "麵 · $200–400",
        price: { start: 200, end: 400 },
        rating: "4.7（151）",
        summary: "牛肉麵、花干｜湯頭濃郁",
      },
      { name: "新開麵店", detail: "麵", price: null, rating: "", summary: "" },
    ],
  });
  assert.match(prompt, /目前條件：內湖，週四 11:30–13:00 有開、「麵」共 2 間/);
  assert.match(prompt, /^八時牛堂｜麵 · \$200–400｜價位 \$200–400｜評分 4\.7（151）｜牛肉麵、花干｜湯頭濃郁$/m);
  assert.match(prompt, /^新開麵店｜麵$/m);
});
