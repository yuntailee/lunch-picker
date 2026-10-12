import { commitFile } from "./github.js";
import { addMember, removeMember, serializeMembers } from "./members.js";

const TOKEN_KEY = "food-tool:github-token";
const MEMBERS_PATH = "data/members.json";

const els = {
  dialog: document.querySelector("#admin"),
  list: document.querySelector("#admin-list"),
  addForm: document.querySelector("#admin-add"),
  name: document.querySelector("#admin-name"),
  token: document.querySelector("#admin-token"),
  status: document.querySelector("#admin-status"),
  save: document.querySelector("#admin-save"),
  close: document.querySelector("#admin-close"),
};

let saved = [];
let draft = [];

export function initAdmin(members, openButton) {
  saved = members;
  els.token.value = localStorage.getItem(TOKEN_KEY) ?? "";
  openButton.addEventListener("click", open);
  els.close.addEventListener("click", () => els.dialog.close());
  els.addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      draft = addMember(draft, els.name.value);
      els.name.value = "";
      setStatus("");
      renderList();
    } catch (error) {
      setStatus(error.message);
    }
  });
  els.save.addEventListener("click", save);
}

function open() {
  draft = saved;
  setStatus("");
  renderList();
  els.dialog.showModal();
}

function renderList() {
  els.list.replaceChildren(
    ...draft.map((member) => {
      const li = document.createElement("li");
      li.append(member.name);
      if (member.admin) {
        const badge = document.createElement("span");
        badge.className = "tags";
        badge.textContent = "管理員";
        li.append(badge);
      } else {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "chip small";
        remove.textContent = "刪除";
        remove.addEventListener("click", () => {
          draft = removeMember(draft, member.name);
          renderList();
        });
        li.append(remove);
      }
      return li;
    }),
  );
  els.save.disabled = draft === saved;
}

async function save() {
  const token = els.token.value.trim();
  if (!token) {
    setStatus("請先貼上 GitHub token");
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  els.save.disabled = true;
  setStatus("儲存中…");
  try {
    await commitFile({
      token,
      path: MEMBERS_PATH,
      content: serializeMembers(draft),
      message: "Update members",
    });
    saved = draft;
    setStatus("已儲存，約 1 分鐘後所有人生效");
  } catch (error) {
    els.save.disabled = false;
    setStatus(`儲存失敗：${error.message}`);
  }
}

function setStatus(text) {
  els.status.textContent = text;
}
