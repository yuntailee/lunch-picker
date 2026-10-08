import { GEMINI_BROWSER_KEY } from "./config.js";
import { generate } from "./gemini.js";
import { PRICE_BUCKETS, priceBucket } from "./recommender.js";

// flash-lite 常推薦超出預算的店；flash 配 low 思考約 5 秒回覆且會遵守價位
const MODEL = "gemini-3.5-flash";
const GREETING = "嗨！想吃什麼跟我說，例如「想吃辣的、200 以下」，我會從目前列表幫你挑。";
// 必須是奇數：對話一問一答交替，奇數才能保證送出的第一則是使用者訊息
const MAX_MESSAGES = 21;

export function buildSystemPrompt({ summary, candidates }) {
  const lines = candidates.map((c) =>
    [c.name, c.detail, c.price && `價位 ${priceBucket(c.price)}`, c.rating && `評分 ${c.rating}`, c.summary]
      .filter(Boolean)
      .join("｜"),
  );
  return `你是午餐推薦小幫手，用繁體中文、像傳訊息一樣口語簡短地回答，不要用 Markdown 符號。
只能推薦下面清單裡的餐廳，店名一字不差照抄（含大小寫）；清單裡沒有符合的就直說。
使用者提到預算時，只能選「價位」標籤符合的店（價位分成 ${PRICE_BUCKETS.map((b) => b.label).join("、")}），沒有價位的店不要推薦。
一次最多推薦 3 間，每間一行，附上一句理由。
目前條件：${summary}
餐廳清單（店名｜分類 · 價格｜價位｜評分｜招牌菜與特色）：
${lines.join("\n")}`;
}

export function initChat(getContext) {
  const els = {
    toggle: document.querySelector("#chat-toggle"),
    panel: document.querySelector("#chat"),
    close: document.querySelector("#chat-close"),
    messages: document.querySelector("#chat-messages"),
    form: document.querySelector("#chat-form"),
    input: document.querySelector("#chat-input"),
  };
  const history = [];
  let busy = false;

  const append = (el) => {
    els.messages.append(el);
    els.messages.scrollTop = els.messages.scrollHeight;
    return el;
  };

  const setOpen = (open) => {
    els.panel.hidden = !open;
    els.toggle.hidden = open;
    if (open) els.input.focus();
  };

  append(bubble("model", GREETING));
  els.toggle.addEventListener("click", () => setOpen(true));
  els.close.addEventListener("click", () => setOpen(false));

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = els.input.value.trim();
    if (!text || busy) return;

    busy = true;
    els.input.value = "";
    append(bubble("user", text));
    history.push({ role: "user", parts: [{ text }] });
    const typing = append(typingBubble());

    try {
      if (!GEMINI_BROWSER_KEY) throw new Error("尚未設定 Gemini 金鑰（config.js 的 GEMINI_BROWSER_KEY）");
      const reply = await generate(GEMINI_BROWSER_KEY, {
        model: MODEL,
        system: buildSystemPrompt(getContext()),
        contents: history.slice(-MAX_MESSAGES),
        generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
      });
      history.push({ role: "model", parts: [{ text: reply }] });
      typing.replaceWith(bubble("model", reply.trim()));
    } catch (error) {
      history.pop();
      typing.replaceWith(bubble("error", `出錯了：${error.message}`));
    } finally {
      busy = false;
      els.messages.scrollTop = els.messages.scrollHeight;
    }
  });
}

function bubble(from, text) {
  const li = document.createElement("li");
  li.className = `chat-bubble from-${from}`;
  li.textContent = text;
  return li;
}

function typingBubble() {
  const li = bubble("model", "");
  li.classList.add("typing");
  li.setAttribute("aria-label", "輸入中");
  li.append(...Array.from({ length: 3 }, () => document.createElement("span")));
  return li;
}
