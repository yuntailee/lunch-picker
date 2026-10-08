import { GOOGLE_MAPS_API_KEY } from "./config.js";

const SHOW_DELAY_MS = 300;
// 滑鼠從店家移到地圖要穿過中間的空隙，這段時間內不能關掉預覽
const HIDE_DELAY_MS = 250;
const GAP_PX = 16;
let frame;
let showTimer;
let hideTimer;

export function embedUrl(placeId) {
  const params = new URLSearchParams({ key: GOOGLE_MAPS_API_KEY, q: `place_id:${placeId}`, language: "zh-TW" });
  return `https://www.google.com/maps/embed/v1/place?${params}`;
}

function show(item, placeId) {
  const src = embedUrl(placeId);
  if (frame.src !== src) frame.src = src;
  frame.hidden = false;
  const rect = item.getBoundingClientRect();
  const centered = rect.top + rect.height / 2 - frame.offsetHeight / 2;
  frame.style.top = `${Math.min(Math.max(centered, GAP_PX), innerHeight - frame.offsetHeight - GAP_PX)}px`;
  frame.style.left = `${rect.left - frame.offsetWidth - GAP_PX}px`;
}

function scheduleHide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    frame.hidden = true;
  }, HIDE_DELAY_MS);
}

export function initPreview(element) {
  frame = element;
  frame.addEventListener("pointerenter", () => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
  });
  frame.addEventListener("pointerleave", scheduleHide);
}

export function previewOnHover(item, placeId) {
  item.addEventListener("pointerenter", () => {
    if (!matchMedia("(hover: hover) and (min-width: 900px)").matches) return;
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(item, placeId), SHOW_DELAY_MS);
  });
  item.addEventListener("pointerleave", () => {
    clearTimeout(showTimer);
    scheduleHide();
  });
}
