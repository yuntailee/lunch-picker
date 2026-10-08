import { GOOGLE_MAPS_API_KEY } from "./config.js";

const HOVER_DELAY_MS = 300;
const GAP_PX = 16;
let timer;

export function embedUrl(placeId) {
  const params = new URLSearchParams({ key: GOOGLE_MAPS_API_KEY, q: `place_id:${placeId}`, language: "zh-TW" });
  return `https://www.google.com/maps/embed/v1/place?${params}`;
}

function show(frame, item, placeId) {
  const src = embedUrl(placeId);
  if (frame.src !== src) frame.src = src;
  frame.hidden = false;
  const rect = item.getBoundingClientRect();
  const centered = rect.top + rect.height / 2 - frame.offsetHeight / 2;
  frame.style.top = `${Math.min(Math.max(centered, GAP_PX), innerHeight - frame.offsetHeight - GAP_PX)}px`;
  frame.style.left = `${rect.left - frame.offsetWidth - GAP_PX}px`;
}

export function previewOnHover(frame, item, placeId) {
  item.addEventListener("pointerenter", () => {
    if (!matchMedia("(hover: hover) and (min-width: 900px)").matches) return;
    clearTimeout(timer);
    timer = setTimeout(() => show(frame, item, placeId), HOVER_DELAY_MS);
  });
  item.addEventListener("pointerleave", () => {
    clearTimeout(timer);
    frame.hidden = true;
  });
}
