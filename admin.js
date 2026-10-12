import { commitFile } from "./github.js";
import { addMember, GROUPS, openRoster, removeMember, serializeDirectory, setGroup, toDirectory } from "./members.js";

const TOKEN_KEY = "food-tool:github-token";
const SECRET_KEY = "food-tool:roster-secret";
const MEMBERS_PATH = "data/members.json";

const els = {
  dialog: document.querySelector("#admin"),
  list: document.querySelector("#admin-list"),
  unlockForm: document.querySelector("#admin-unlock"),
  secret: document.querySelector("#admin-secret"),
  addForm: document.querySelector("#admin-add"),
  name: document.querySelector("#admin-name"),
  token: document.querySelector("#admin-token"),
  status: document.querySelector("#admin-status"),
  save: document.querySelector("#admin-save"),
  close: document.querySelector("#admin-close"),
};

let roster = "";
let saved = [];
let draft = [];
let unlocked = false;

export function initAdmin(directory, openButton) {
  roster = directory.roster;
  els.secret.value = localStorage.getItem(SECRET_KEY) ?? "";
  els.token.value = localStorage.getItem(TOKEN_KEY) ?? "";
  openButton.addEventListener("click", open);
  els.close.addEventListener("click", () => els.dialog.close());
  els.unlockForm.addEventListener("submit", (event) => {
    event.preventDefault();
    unlock();
  });
  els.addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!unlocked) return;
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
  draft = [];
  saved = [];
  unlocked = false;
  setStatus("");
  renderList();
  els.dialog.showModal();
  if (els.secret.value.trim()) unlock();
}

async function unlock() {
  const secret = els.secret.value.trim();
  if (!secret) {
    setStatus("請輸入名單密碼");
    return;
  }
  try {
    draft = await openRoster(roster, secret);
    saved = draft;
    unlocked = true;
    localStorage.setItem(SECRET_KEY, secret);
    setStatus("");
    renderList();
  } catch {
    draft = [];
    saved = [];
    unlocked = false;
    setStatus("名單密碼不對");
    renderList();
  }
}

function renderList() {
  els.list.replaceChildren(
    ...draft.map((member) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "admin-member";
      name.textContent = member.name;
      li.append(name, groupSelect(member));
      if (member.admin) {
        const badge = document.createElement("span");
        badge.className = "tags admin-badge";
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
  els.name.disabled = !unlocked;
  els.addForm.querySelector("button").disabled = !unlocked;
  els.save.disabled = !unlocked || draft === saved;
}

function groupSelect(member) {
  const select = document.createElement("select");
  select.className = "admin-group";
  select.setAttribute("aria-label", `${member.name} 的群組`);
  select.append(...GROUPS.map((group) => new Option(group, group, false, group === member.group)));
  select.addEventListener("change", () => {
    draft = setGroup(draft, member.name, select.value);
    renderList();
  });
  return select;
}

async function save() {
  const token = els.token.value.trim();
  if (!token) {
    setStatus("請先貼上 GitHub token");
    return;
  }
  const secret = els.secret.value.trim();
  if (!unlocked || !secret) {
    setStatus("請先解開名單");
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SECRET_KEY, secret);
  els.save.disabled = true;
  setStatus("儲存中…");
  try {
    const directory = await toDirectory(draft, secret);
    roster = directory.roster;
    await commitFile({
      token,
      path: MEMBERS_PATH,
      content: serializeDirectory(directory),
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
