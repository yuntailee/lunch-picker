export function filterByTag(restaurants, tag) {
  return tag ? restaurants.filter((r) => r.tags.includes(tag)) : restaurants;
}

export function pickRandom(items, random = Math.random) {
  return items.length ? items[Math.floor(random() * items.length)] : null;
}
