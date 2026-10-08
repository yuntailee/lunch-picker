import assert from "node:assert/strict";
import { test } from "node:test";

import { filterByLunch, lunchDays, weekdayLabel } from "../hours.js";

const period = (day, open, close, closeDay = day) => ({
  open: { day, hour: open[0], minute: open[1] },
  close: { day: closeDay, hour: close[0], minute: close[1] },
});

test("lunchDays 只算 11:30–13:00 全程有開的日子，公休日不列入", () => {
  const weekdays = [1, 2, 3, 4, 5].map((day) => period(day, [11, 0], [14, 0]));
  assert.deepEqual(lunchDays(weekdays), [1, 2, 3, 4, 5]);
});

test("lunchDays 排除中午才開或提早休息的時段", () => {
  assert.deepEqual(lunchDays([period(1, [12, 0], [20, 0]), period(2, [10, 0], [12, 30])]), []);
});

test("lunchDays 剛好 11:30 開、13:00 休息也算", () => {
  assert.deepEqual(lunchDays([period(3, [11, 30], [13, 0])]), [3]);
});

test("lunchDays 處理 Google 省略的 0 值與 24 小時營業", () => {
  assert.deepEqual(lunchDays([{ open: { hour: 11 }, close: { hour: 14 } }]), [0]);
  assert.deepEqual(lunchDays([{ open: { day: 0, hour: 0, minute: 0 } }]), [0, 1, 2, 3, 4, 5, 6]);
});

test("lunchDays 處理跨週的營業時段（週六開到週日下午）", () => {
  assert.deepEqual(lunchDays([period(6, [10, 0], [15, 0], 0)]), [0, 6]);
});

test("lunchDays 沒有營業時間資料時回傳空陣列", () => {
  assert.deepEqual(lunchDays(undefined), []);
});

test("filterByLunch 只留下指定星期有開的店", () => {
  const items = [{ name: "平日店", lunchDays: [1, 2, 3, 4, 5] }, { name: "週末店", lunchDays: [0, 6] }];
  assert.deepEqual(filterByLunch(items, 6).map((i) => i.name), ["週末店"]);
});

test("weekdayLabel 轉成中文星期", () => {
  assert.equal(weekdayLabel(0), "週日");
  assert.equal(weekdayLabel(4), "週四");
});
