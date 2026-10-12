import { initAdmin } from "./admin.js";
import { GOOGLE_MAPS_API_KEY } from "./config.js";
import { SEARCH_RADIUS_M } from "./geo.js";
import { locationsForGroup, matchMember } from "./members.js";
import { initContextMenu, openContextMenu } from "./menu.js";
import { geocode, searchNearby } from "./places.js";
import { initPreview, previewOnHover } from "./preview.js";
import {
  excludePlaces,
  excludeTags,
  filterByPrice,
  filterByTag,
  formatHighlight,
  formatPrice,
  formatRating,
  pickRandom,
  PRICE_BUCKETS,
} from "./recommender.js";

const MEMBER_KEY = "food-tool:member";
const OTHER_TAG = "其他";
const ALL_TAGS = "全部";
const ANY_PRICE = "不限";
const MODES = { list: "每日清單", live: "即時搜尋" };
const SPIN_TICKS = 12;
const SPIN_INTERVAL_MS = 60;

let crawledLocations = [];
let catalog = { categories: [], locations: [] };

const state = {
  member: null,
  updatedAt: null,
  locations: [],
  location: null,
  mode: "list",
  tag: null,
  excluding: false,
  excludedTags: [],
  blacklist: [],
  price: null,
  candidates: [],
  requestId: 0,
  spinning: false,
};

const els = {
  user: document.querySelector("#user"),
  userName: document.querySelector("#user-name"),
  adminOpen: document.querySelector("#admin-open"),
  logout: document.querySelector("#logout"),
  login: document.querySelector("#login"),
  loginName: document.querySelector("#login-name"),
  loginError: document.querySelector("#login-error"),
  main: document.querySelector("main"),
  locations: document.querySelector("#locations"),
  locationForm: document.querySelector("#location-form"),
  locationInput: document.querySelector("#location-input"),
  modes: document.querySelector("#modes"),
  tags: document.querySelector("#tags"),
  tagsSwitch: document.querySelector("#tags-switch"),
  prices: document.querySelector("#prices"),
  keywordForm: document.querySelector("#keyword-form"),
  keyword: document.querySelector("#keyword"),
  random: document.querySelector("#random"),
  blacklistOpen: document.querySelector("#blacklist-open"),
  contextMenu: document.querySelector("#context-menu"),
  result: document.querySelector("#result"),
  count: document.querySelector("#count"),
  list: document.querySelector("#list"),
  preview: document.querySelector("#preview"),
};

async function init() {
  const fetchJson = (url) => fetch(url, { cache: "no-cache" }).then((response) => response.json());
  const [directory, data, config] = await Promise.all([
    fetchJson("data/members.json"),
    fetchJson("data/restaurants.json"),
    fetchJson("data/config.json"),
  ]);
  state.updatedAt = new Date(data.updatedAt);
  crawledLocations = data.locations;
  catalog = config;

  els.login.addEventListener("submit", async (event) => {
    event.preventDefault();
    const member = await matchMember(directory.members, els.loginName.value);
    if (!member) {
      els.loginError.textContent = "找不到這個名字，請找管理員新增帳號";
      return;
    }
    localStorage.setItem(MEMBER_KEY, member.name);
    start(member, directory);
  });
  els.logout.addEventListener("click", () => {
    localStorage.removeItem(MEMBER_KEY);
    location.reload();
  });
  initPreview(els.preview);
  initContextMenu(els.contextMenu);
  els.random.addEventListener("click", spin);
  els.blacklistOpen.addEventListener("click", showBlacklist);
  els.locationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = els.locationInput.value.trim();
    if (query) setCustomLocation(query);
  });
  els.keywordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    selectTag(els.keyword.value.trim() || ALL_TAGS);
  });
  els.tagsSwitch.addEventListener("click", () => {
    state.excluding = !state.excluding;
    state.tag = null;
    render();
  });

  const member = await matchMember(directory.members, localStorage.getItem(MEMBER_KEY));
  if (member) {
    start(member, directory);
  } else {
    els.login.hidden = false;
    els.loginName.focus();
  }
}

function start(member, directory) {
  state.member = member;
  state.locations = locationsForGroup(catalog.locations, crawledLocations, member.group, catalog.categories);
  const prefs = JSON.parse(localStorage.getItem(prefsKey()) ?? "{}");
  if (prefs.customLocation && !state.locations.some((l) => l.name === prefs.customLocation.name)) {
    state.locations.push(customLocation(prefs.customLocation));
  }
  state.location = state.locations.find((l) => l.name === prefs.location) ?? state.locations[0];
  if (!state.location.restaurants) state.mode = "live";
  state.excluding = prefs.excluding ?? false;
  state.excludedTags = prefs.excludedTags ?? [];
  state.blacklist = prefs.blacklist ?? [];

  els.userName.textContent = member.name;
  els.adminOpen.hidden = !member.admin;
  if (member.admin) initAdmin(directory, els.adminOpen);
  els.login.hidden = true;
  els.user.hidden = false;
  els.main.hidden = false;
  render();
}

function prefsKey() {
  return `food-tool:prefs:${state.member.name.toLowerCase()}`;
}

function savePrefs() {
  const custom = state.locations.find((l) => l.custom);
  localStorage.setItem(
    prefsKey(),
    JSON.stringify({
      location: state.location.name,
      customLocation: custom ? { name: custom.name, lat: custom.lat, lng: custom.lng } : null,
      excluding: state.excluding,
      excludedTags: state.excludedTags,
      blacklist: state.blacklist,
    }),
  );
}

// 「不想吃」只在每日清單有分類資料時才生效，切到即時搜尋時保留設定但不套用
function isExcluding() {
  return state.excluding && state.mode === "list";
}

function render() {
  savePrefs();
  const is = (value) => (label) => label === value;
  const excluding = isExcluding();
  renderChips(els.locations, state.locations.map((l) => l.name), is(state.location.name), selectLocation, "map-pin");
  renderChips(els.modes, state.location.restaurants ? Object.values(MODES) : [MODES.live], is(MODES[state.mode]), selectMode);
  if (excluding) {
    renderChips(els.tags, state.location.tags, (label) => state.excludedTags.includes(label), selectTag);
  } else {
    renderChips(els.tags, [ALL_TAGS, ...state.location.tags], is(state.tag ?? ALL_TAGS), selectTag);
  }
  renderChips(els.prices, [ANY_PRICE, ...PRICE_BUCKETS.map((b) => b.label)], is(state.price ?? ANY_PRICE), selectPrice);
  els.tagsSwitch.setAttribute("aria-checked", !excluding);
  els.tagsSwitch.disabled = state.mode !== "list";
  els.tagsSwitch.textContent = excluding ? "不想吃" : "想吃";
  els.tags.classList.toggle("excluding", excluding);
  els.keywordForm.hidden = state.mode !== "live";
  els.keyword.value = state.tag ?? "";
  els.result.hidden = true;
  renderBlacklistLink();
  loadCandidates();
}

function renderBlacklistLink() {
  els.blacklistOpen.textContent = `檢視黑名單（${state.blacklist.length}）`;
}

function selectLocation(name) {
  state.location = state.locations.find((l) => l.name === name);
  state.tag = null;
  if (!state.location.restaurants) state.mode = "live";
  render();
}

function customLocation({ name, lat, lng }) {
  const tags = [...new Set(state.locations.flatMap((l) => l.tags ?? []))].filter((t) => t !== OTHER_TAG);
  return { name, lat, lng, tags, restaurants: null, custom: true };
}

async function setCustomLocation(query) {
  if (state.locations.some((l) => l.name === query && !l.custom)) {
    selectLocation(query);
    return;
  }
  showMessage(`定位「${query}」中…`, "map-pin");
  try {
    const found = await geocode({ apiKey: GOOGLE_MAPS_API_KEY, query });
    state.locations = [...state.locations.filter((l) => !l.custom), customLocation(found)];
    els.locationInput.value = "";
    selectLocation(found.name);
  } catch (error) {
    showMessage(`定位失敗：${error.message}`);
  }
}

function selectMode(label) {
  state.mode = Object.keys(MODES).find((key) => MODES[key] === label);
  render();
}

function selectTag(tag) {
  if (isExcluding()) {
    state.excludedTags = state.excludedTags.includes(tag)
      ? state.excludedTags.filter((t) => t !== tag)
      : [...state.excludedTags, tag];
  } else {
    state.tag = tag === ALL_TAGS ? null : tag;
  }
  render();
}

function selectPrice(label) {
  state.price = label === ANY_PRICE ? null : label;
  render();
}

function narrow(candidates) {
  return excludePlaces(filterByPrice(candidates, state.price), state.blacklist);
}

async function loadCandidates() {
  const requestId = ++state.requestId;

  if (state.mode === "list") {
    const restaurants = isExcluding()
      ? excludeTags(state.location.restaurants, state.excludedTags)
      : filterByTag(state.location.restaurants, state.tag);
    showCandidates(narrow(restaurants.map(fromList)));
    return;
  }
  if (!GOOGLE_MAPS_API_KEY) {
    showMessage("尚未設定 Google 金鑰：請在 config.js 填入 GOOGLE_MAPS_API_KEY");
    return;
  }

  showMessage("Google 地圖搜尋中…", "magnifying-glass");
  try {
    const candidates = await searchNearby({
      apiKey: GOOGLE_MAPS_API_KEY,
      location: state.location,
      keyword: state.tag ?? "餐廳",
    });
    if (requestId === state.requestId) showCandidates(narrow(candidates));
  } catch (error) {
    if (requestId === state.requestId) showMessage(`Google 搜尋失敗：${error.message}`);
  }
}

function fromList(restaurant) {
  return {
    placeId: restaurant.placeId,
    name: restaurant.name,
    detail: [restaurant.tags.join("、"), formatPrice(restaurant.price)].filter(Boolean).join(" · "),
    rating: formatRating(restaurant.rating, restaurant.ratingCount),
    address: restaurant.address,
    mapUrl: restaurant.mapUrl,
    price: restaurant.price,
    summary: formatHighlight(restaurant),
  };
}

function showCandidates(candidates) {
  state.candidates = candidates;
  els.count.textContent = countText(candidates.length);
  els.list.replaceChildren(...candidates.map(listItem));
}

function showBlacklist() {
  state.requestId += 1;
  const back = document.createElement("button");
  back.type = "button";
  back.className = "chip small";
  back.textContent = "返回清單";
  back.addEventListener("click", render);
  const title = state.blacklist.length ? `黑名單共 ${state.blacklist.length} 間` : "黑名單是空的";
  els.count.replaceChildren(title, " ", back);
  els.list.replaceChildren(...state.blacklist.map(blacklistItem));
}

function addToBlacklist(candidate) {
  state.blacklist = [...state.blacklist, candidate];
  render();
}

function removeFromBlacklist(candidate) {
  state.blacklist = state.blacklist.filter((item) => item.placeId !== candidate.placeId);
  savePrefs();
  renderBlacklistLink();
  showBlacklist();
}

function showMessage(text, icon) {
  state.candidates = [];
  els.count.replaceChildren(...(icon ? [iconEl(icon), " "] : []), text);
  els.list.replaceChildren();
}

function countText(count) {
  const budget = state.price ? `${state.price}的` : "";
  if (state.mode === "list") {
    const updated = state.updatedAt.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });
    return `${budget}${listTarget()}共 ${count} 間（${updated} 更新）`;
  }
  const target = state.tag ? `「${state.tag}」` : "餐廳";
  return `${SEARCH_RADIUS_M} 公尺內${budget}${target}共 ${count} 間`;
}

function listTarget() {
  if (isExcluding()) return state.excludedTags.length ? `不含「${state.excludedTags.join("、")}」` : "全部";
  return state.tag ? `「${state.tag}」` : "全部";
}

function renderChips(container, labels, isActive, onSelect, icon) {
  container.replaceChildren(
    ...labels.map((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.append(...(icon ? [iconEl(icon), " "] : []), label);
      button.setAttribute("aria-pressed", String(isActive(label)));
      button.addEventListener("click", () => onSelect(label));
      return button;
    }),
  );
}

function listItem(candidate) {
  return candidateItem(candidate, [
    { label: "開啟", onSelect: () => openMap(candidate) },
    { label: "加入黑名單", onSelect: () => addToBlacklist(candidate) },
  ]);
}

function blacklistItem(candidate) {
  const li = candidateItem(candidate, [
    { label: "開啟", onSelect: () => openMap(candidate) },
    { label: "移出黑名單", onSelect: () => removeFromBlacklist(candidate) },
  ]);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "chip small";
  remove.textContent = "移出";
  remove.addEventListener("click", () => removeFromBlacklist(candidate));
  li.querySelector(".heading").append(remove);
  return li;
}

function candidateItem(candidate, menuItems) {
  const heading = document.createElement("div");
  heading.className = "heading";
  heading.append(mapLink(candidate.mapUrl, candidate.name), detailEl("span", candidate));
  const li = document.createElement("li");
  li.append(heading);
  if (candidate.summary) li.append(summaryEl("summary", candidate.summary));
  li.addEventListener("contextmenu", (event) => openContextMenu(event, menuItems));
  previewOnHover(li, candidate.placeId);
  return li;
}

function openMap(candidate) {
  window.open(candidate.mapUrl, "_blank", "noopener");
}

function detailEl(tag, candidate) {
  const el = textEl(tag, "tags", candidate.detail);
  if (candidate.rating) el.append(candidate.detail ? " · " : "", iconEl("star"), ` ${candidate.rating}`);
  return el;
}

function summaryEl(className, text) {
  const el = textEl("p", className, ` ${text}`);
  el.prepend(iconEl("fork-knife"));
  return el;
}

function spin() {
  const candidates = state.candidates;
  if (state.spinning || candidates.length === 0) return;

  state.spinning = true;
  els.random.disabled = true;
  els.random.classList.add("rolling");
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
    els.random.classList.remove("rolling");
  }, SPIN_INTERVAL_MS);
}

function showResult(candidate) {
  const link = mapLink(candidate.mapUrl, "在 Google 地圖開啟 →");
  link.className = "map-link";
  els.result.replaceChildren(
    textEl("p", "result-name", candidate.name),
    detailEl("p", candidate),
    ...(candidate.address ? [textEl("p", "tags", candidate.address)] : []),
    ...(candidate.summary ? [summaryEl("result-summary", candidate.summary)] : []),
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

function iconEl(name) {
  const el = document.createElement("span");
  el.className = `icon icon-${name}`;
  el.setAttribute("aria-hidden", "true");
  return el;
}

function textEl(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

init();
