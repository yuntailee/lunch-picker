const EDGE_PX = 8;

let menu;

function close() {
  menu.hidden = true;
}

export function initContextMenu(element) {
  menu = element;
  // capture 階段先關掉舊選單，接著項目自己的 contextmenu 才會開新的
  document.addEventListener("contextmenu", close, true);
  document.addEventListener("click", close);
  document.addEventListener("scroll", close, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  window.addEventListener("blur", close);
}

export function openContextMenu(event, items) {
  event.preventDefault();
  menu.replaceChildren(
    ...items.map(({ label, onSelect }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "menuitem");
      button.textContent = label;
      button.addEventListener("click", onSelect);
      return button;
    }),
  );
  menu.hidden = false;
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(event.clientX, innerWidth - width - EDGE_PX)}px`;
  menu.style.top = `${Math.min(event.clientY, innerHeight - height - EDGE_PX)}px`;
  menu.querySelector("button").focus();
}
