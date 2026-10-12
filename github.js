const REPO = "yuntailee/lunch-picker";

export function toBase64(text) {
  return btoa(String.fromCodePoint(...new TextEncoder().encode(text)));
}

function errorText(status) {
  if (status === 401 || status === 403 || status === 404) return "token 無效，或沒有這個 repo 的 Contents 寫入權限";
  if (status === 409) return "檔案剛被別人改過，請重新整理後再存一次";
  return `GitHub 回應 ${status}`;
}

export async function commitFile({ token, path, content, message }) {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };

  const current = await fetch(url, { headers, cache: "no-store" });
  if (!current.ok) throw new Error(errorText(current.status));
  const { sha } = await current.json();

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content: toBase64(content), sha }),
  });
  if (!response.ok) throw new Error(errorText(response.status));
}
