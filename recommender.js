export const PRICE_BUCKETS = [
  { label: "$200 以下", max: 200 },
  { label: "$200–400", max: 400 },
  { label: "$400 以上", max: Infinity },
];

export function filterByTag(restaurants, tag) {
  return tag ? restaurants.filter((r) => r.tags.includes(tag)) : restaurants;
}

export function toPrice(priceRange) {
  if (!priceRange?.startPrice) return null;
  return {
    start: Number(priceRange.startPrice.units ?? 0),
    end: priceRange.endPrice ? Number(priceRange.endPrice.units) : null,
  };
}

export function priceBucket(price) {
  if (!price) return null;
  const top = price.end ?? price.start;
  return PRICE_BUCKETS.find((bucket) => top <= bucket.max).label;
}

export function filterByPrice(items, label) {
  return label ? items.filter((item) => priceBucket(item.price) === label) : items;
}

export function formatPrice(price) {
  if (!price) return "";
  return price.end ? `$${price.start}–${price.end}` : `$${price.start} 以上`;
}

export function formatRating(rating, ratingCount) {
  return rating ? `⭐ ${rating.toFixed(1)}（${(ratingCount ?? 0).toLocaleString()}）` : "";
}

export function summaryHighlight(text) {
  return text?.split("\n")[0].trim() ?? "";
}

export function formatHighlight({ gist, dishes }) {
  return [dishes.length ? `🍽 ${dishes.join("、")}` : "", gist].filter(Boolean).join("｜");
}

export function pickRandom(items, random = Math.random) {
  return items.length ? items[Math.floor(random() * items.length)] : null;
}
