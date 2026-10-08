export function tagsOf(restaurants) {
  return [...new Set(restaurants.flatMap((r) => r.tags))];
}

export function filterByTag(restaurants, tag) {
  return tag ? restaurants.filter((r) => r.tags.includes(tag)) : restaurants;
}

export function pickRandom(items, random = Math.random) {
  return items.length ? items[Math.floor(random() * items.length)] : null;
}

export function mapUrl(restaurant, area) {
  const query = encodeURIComponent(`${restaurant.name} ${area}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
