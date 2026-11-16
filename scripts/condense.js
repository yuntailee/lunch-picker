const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const BATCH_SIZE = 40;
const MAX_DISHES = 4;
// 429 / 5xx 是模型暫時過載或上游斷線。400 這類是請求本身有問題，重試不會好。
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 7;
const BASE_DELAY_MS = 3_000;
const MAX_BACKOFF_MS = 60_000;
const MAX_RETRY_AFTER_MS = 120_000;

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

export function isRetryableStatus(status) {
  return RETRYABLE_STATUS.has(status);
}

// attempt 從 1 起算：第 1 次失敗等 3 秒，之後倍增，最長 60 秒。有 Retry-After 就以它為準，最長 120 秒。
export function retryDelayMs(attempt, retryAfterHeader) {
  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(Math.round(seconds * 1000), MAX_RETRY_AFTER_MS);
  return Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestBatch(apiKey, texts) {
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCTION }] },
        contents: [{ parts: [{ text: JSON.stringify(texts.map((text, id) => ({ id, text }))) }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        retryable: isRetryableStatus(response.status),
        retryAfter: response.headers.get("retry-after"),
        error: new Error(`Gemini 濃縮失敗：${data.error?.message ?? response.status}`),
      };
    }
    return { ok: true, value: parseCondensed(data.candidates[0].content.parts[0].text, texts.length) };
  } catch (error) {
    return { ok: false, retryable: true, error };
  }
}

async function condenseBatch(apiKey, texts) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await requestBatch(apiKey, texts);
    if (result.ok) return result.value;
    const message = result.error?.message ?? String(result.error);
    if (!result.retryable) throw result.error;
    if (attempt === MAX_ATTEMPTS) throw new Error(`${message}（已重試 ${MAX_ATTEMPTS} 次）`);
    const delay = retryDelayMs(attempt, result.retryAfter);
    console.warn(`${message}，${Math.round(delay / 1000)} 秒後重試（${attempt}/${MAX_ATTEMPTS}）`);
    await wait(delay);
  }
}

export async function condenseSummaries(apiKey, texts) {
  const results = [];
  for (const batch of toBatches(texts, BATCH_SIZE)) {
    results.push(...(await condenseBatch(apiKey, batch)));
  }
  return results;
}
