export const LUNCH_LABEL = "11:30–13:00";
const LUNCH_START = 11 * 60 + 30;
const LUNCH_END = 13 * 60;
const DAY = 24 * 60;
const WEEK = 7 * DAY;
const WEEKDAYS = "日一二三四五六";

// Google 回傳的數值欄位是 0 時會被省略
const minutes = ({ day = 0, hour = 0, minute = 0 }) => day * DAY + hour * 60 + minute;

function toSpan({ open, close }) {
  // 24 小時營業：只有 open、沒有 close
  if (!close) return [0, Infinity];
  const start = minutes(open);
  const end = minutes(close);
  return [start, end <= start ? end + WEEK : end];
}

export function lunchDays(periods) {
  const spans = (periods ?? []).map(toSpan);
  return [0, 1, 2, 3, 4, 5, 6].filter((day) => {
    const start = day * DAY + LUNCH_START;
    const end = day * DAY + LUNCH_END;
    return spans.some(([open, close]) => [0, WEEK].some((shift) => open <= start + shift && end + shift <= close));
  });
}

export function filterByLunch(items, day) {
  return items.filter((item) => item.lunchDays.includes(day));
}

export function weekdayLabel(day) {
  return `週${WEEKDAYS[day]}`;
}
