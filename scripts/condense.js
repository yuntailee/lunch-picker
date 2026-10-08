import { generate } from "../gemini.js";

const MODEL = "gemini-3.5-flash-lite";
const BATCH_SIZE = 40;
const MAX_DISHES = 4;

const INSTRUCTION = `你會收到一個 JSON 陣列，每筆是一間餐廳的 Google 評論摘要（id 與 text）。
為每一筆輸出：
- id：原樣保留
- dishes：摘要中明確提到的菜名，最多 ${MAX_DISHES} 個，用簡短菜名（例如「肉燥麵」），沒有提到就給空陣列，不可捏造
- gist：15 個字以內的餐點特色重點（口味、份量），不要提服務、環境、價格、店員
使用繁體中文。`;

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "INTEGER" },
      dishes: { type: "ARRAY", items: { type: "STRING" } },
      gist: { type: "STRING" },
    },
    required: ["id", "dishes", "gist"],
  },
};

export function toBatches(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

export function parseCondensed(json, count) {
  const byId = new Map(JSON.parse(json).map((item) => [item.id, item]));
  return Array.from({ length: count }, (_, id) => ({
    gist: byId.get(id)?.gist ?? "",
    dishes: (byId.get(id)?.dishes ?? []).slice(0, MAX_DISHES),
  }));
}

async function condenseBatch(apiKey, texts) {
  const json = await generate(apiKey, {
    model: MODEL,
    system: INSTRUCTION,
    contents: [{ role: "user", parts: [{ text: JSON.stringify(texts.map((text, id) => ({ id, text }))) }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA },
  }).catch((error) => {
    throw new Error(`Gemini 濃縮失敗：${error.message}`);
  });
  return parseCondensed(json, texts.length);
}

export async function condenseSummaries(apiKey, texts) {
  const results = [];
  for (const batch of toBatches(texts, BATCH_SIZE)) {
    results.push(...(await condenseBatch(apiKey, batch)));
  }
  return results;
}
