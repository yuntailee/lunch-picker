// 群組 → 登入後預設的地點（地點名稱要跟 data/config.json 一致）
export const GROUPS = { 公司: "內湖", 仁愛醫院: "仁愛醫院" };
const DEFAULT_GROUP = Object.keys(GROUPS)[0];

const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export function findMember(members, name) {
  const trimmed = (name ?? "").trim();
  return members.find((member) => sameName(member.name, trimmed)) ?? null;
}

export function addMember(members, name) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!NAME_PATTERN.test(trimmed)) throw new Error("請輸入英文姓名");
  if (findMember(members, trimmed)) throw new Error(`「${trimmed}」已經存在`);
  return [...members, { name: trimmed, group: DEFAULT_GROUP }];
}

export function removeMember(members, name) {
  return members.filter((member) => member.name !== name);
}

export function setGroup(members, name, group) {
  return members.map((member) => (member.name === name ? { ...member, group } : member));
}

export function serializeMembers(members) {
  return `${JSON.stringify({ members }, null, 2)}\n`;
}
