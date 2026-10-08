import assert from "node:assert/strict";
import { test } from "node:test";

import { GOOGLE_MAPS_API_KEY } from "../config.js";
import { embedUrl } from "../preview.js";

test("embedUrl 用 placeId 組出 Maps Embed API 網址", () => {
  const url = new URL(embedUrl("ChIJ-abc"));
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/embed/v1/place");
  assert.equal(url.searchParams.get("q"), "place_id:ChIJ-abc");
  assert.equal(url.searchParams.get("key"), GOOGLE_MAPS_API_KEY);
  assert.equal(url.searchParams.get("language"), "zh-TW");
});
