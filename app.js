import { GOOGLE_MAPS_API_KEY } from "./config.js";
import { SEARCH_RADIUS_M } from "./geo.js";
import { searchNearby } from "./places.js";
import {
  filterByPrice,
  filterByTag,
  formatHighlight,
  formatPrice,
  formatRating,
  pickRandom,
  PRICE_BUCKETS,
} from "./recommender.js";

const LOCATION_KEY = "food-tool:location";
const ALL_TAGS = "全部";
const ANY_PRICE = "不限";
const MODES = { list: "每日清單", live: "即時搜尋" };
const SPIN_TICKS = 12;
const SPIN_INTERVAL_MS = 60;

const state = {
  updatedAt: null,
  locations: [],
  location: null,
  mode: "list",
  tag: null,
  price: null,
  candidates: [],
  requestId: 0,
  spinning: false,
};

const els = {
  locations: document.querySelector("#locations"),
  modes: document.querySelector("#modes"),
  tags: document.querySelector("#tags"),
  prices: document.querySelector("#prices"),
  keywordForm: document.querySelector("#keyword-form"),
  keyword: document.querySelector("#keyword"),
  random: document.querySelector("#random"),
  result: document.querySelector("#result"),
  count: document.querySelector("#count"),
  list: document.querySelector("#list"),
};

async function init() {
  const response = await fetch("data/restaurants.json", { cache: "no-cache" });
  const data = await response.json();
  state.updatedAt = new Date(data.updatedAt);
  state.locations = data.locations;
  const saved = localStorage.getItem(LOCATION_KEY);
  state.location = state.locations.find((l) => l.name === saved) ?? state.locations[0];

  els.random.addEventListener("click", spin);
  els.keywordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    selectTag(els.keyword.value.trim() || ALL_TAGS);
  });
  render();
}

function render() {
  renderChips(els.locations, state.locations.map((l) => l.name), state.location.name, selectLocation);
  renderChips(els.modes, Object.values(MODES), MODES[state.mode], selectMode);
  renderChips(els.tags, [ALL_TAGS, ...state.location.tags], state.tag ?? ALL_TAGS, selectTag);
  renderChips(els.prices, [ANY_PRICE, ...PRICE_BUCKETS.map((b) => b.label)], state.price ?? ANY_PRICE, selectPrice);
  els.keywordForm.hidden = state.mode !== "live";
  els.keyword.value = state.tag ?? "";
  els.result.hidden = true;
  loadCandidates();
}

function selectLocation(name) {
  state.location = state.locations.find((l) => l.name === name);
  state.tag = null;
  localStorage.setItem(LOCATION_KEY, name);
  render();
}

function selectMode(label) {
  state.mode = Object.keys(MODES).find((key) => MODES[key] === label);
  render();
}

function selectTag(tag) {
  state.tag = tag === ALL_TAGS ? null : tag;
  render();
}

function selectPrice(label) {
  state.price = label === ANY_PRICE ? null : label;
  render();
}

async function loadCandidates() {
  const requestId = ++state.requestId;

  if (state.mode === "list") {
    showCandidates(filterByPrice(filterByTag(state.location.restaurants, state.tag).map(fromList), state.price));
    return;
  }
  if (!GOOGLE_MAPS_API_KEY) {
    showMessage("尚未設定 Google 金鑰：請在 config.js 填入 GOOGLE_MAPS_API_KEY");
    return;
  }

  showMessage("🔍 Google 地圖搜尋中…");
  try {
    const candidates = await searchNearby({
      apiKey: GOOGLE_MAPS_API_KEY,
      location: state.location,
      keyword: state.tag ?? "餐廳",
    });
    if (requestId === state.requestId) showCandidates(filterByPrice(candidates, state.price));
  } catch (error) {
    if (requestId === state.requestId) showMessage(`Google 搜尋失敗：${error.message}`);
  }
}

function fromList(restaurant) {
  const detail = [
    restaurant.tags.join("、"),
    formatPrice(restaurant.price),
    formatRating(restaurant.rating, restaurant.ratingCount),
  ];
  return {
    name: restaurant.name,
    detail: detail.filter(Boolean).join(" · "),
    address: restaurant.address,
    mapUrl: restaurant.mapUrl,
    price: restaurant.price,
    summary: formatHighlight(restaurant),
  };
}

function showCandidates(candidates) {
  state.candidates = candidates;
  els.count.textContent = countText(candidates.length);
  els.list.replaceChildren(...candidates.map(candidateItem));
}

function showMessage(text) {
  state.candidates = [];
  els.count.textContent = text;
  els.list.replaceChildren();
}

function countText(count) {
  const budget = state.price ? `${state.price}的` : "";
  if (state.mode === "list") {
    const updated = state.updatedAt.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });
    return `${budget}${state.tag ? `「${state.tag}」` : "全部"}共 ${count} 間（${updated} 更新）`;
  }
  const target = state.tag ? `「${state.tag}」` : "餐廳";
  return `${SEARCH_RADIUS_M} 公尺內營業中、${budget}${target}共 ${count} 間`;
}

function renderChips(container, labels, active, onSelect) {
  container.replaceChildren(
    ...labels.map((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(label === active));
      button.addEventListener("click", () => onSelect(label));
      return button;
    }),
  );
}

function candidateItem(candidate) {
  const li = document.createElement("li");
  li.append(mapLink(candidate.mapUrl, candidate.name), textEl("p", "tags", candidate.detail));
  if (candidate.summary) li.append(textEl("p", "summary", candidate.summary));
  return li;
}

function spin() {
  const candidates = state.candidates;
  if (state.spinning || candidates.length === 0) return;

  state.spinning = true;
  els.random.disabled = true;
  els.result.hidden = false;
  els.result.classList.remove("done");

  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    if (tick < SPIN_TICKS) {
      els.result.replaceChildren(textEl("p", "result-name", pickRandom(candidates).name));
      return;
    }
    clearInterval(timer);
    showResult(pickRandom(candidates));
    state.spinning = false;
    els.random.disabled = false;
  }, SPIN_INTERVAL_MS);
}

function showResult(candidate) {
  const link = mapLink(candidate.mapUrl, "在 Google 地圖開啟 →");
  link.className = "map-link";
  els.result.replaceChildren(
    textEl("p", "result-name", candidate.name),
    textEl("p", "tags", candidate.detail),
    ...(candidate.address ? [textEl("p", "tags", candidate.address)] : []),
    ...(candidate.summary ? [textEl("p", "result-summary", candidate.summary)] : []),
    link,
  );
  els.result.classList.add("done");
}

function mapLink(href, text) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = text;
  return link;
}

function textEl(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

init();
