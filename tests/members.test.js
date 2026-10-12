import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { addMember, findMember, GROUPS, removeMember, serializeMembers, setGroup } from "../members.js";

const members = [
  { name: "Kiro", group: "公司", admin: true },
  { name: "Stan", group: "公司" },
];

test("findMember 不分大小寫、忽略前後空白", () => {
  assert.equal(findMember(members, "  kIRo ").name, "Kiro");
  assert.equal(findMember(members, "STAN").name, "Stan");
  assert.equal(findMember(members, "Nobody"), null);
  assert.equal(findMember(members, ""), null);
  assert.equal(findMember(members, null), null);
});

test("addMember 只收英文姓名、不分大小寫不能重複，預設分在第一個群組", () => {
  assert.deepEqual(addMember(members, "  Mary   Jane ").at(-1), { name: "Mary Jane", group: GROUPS[0] });
  assert.throws(() => addMember(members, "stan"), /已經存在/);
  assert.throws(() => addMember(members, "小明"), /英文姓名/);
  assert.throws(() => addMember(members, "   "), /英文姓名/);
});

test("removeMember 移除指定成員", () => {
  assert.deepEqual(removeMember(members, "Stan"), [members[0]]);
});

test("setGroup 只改指定成員的群組，不動原陣列", () => {
  const next = setGroup(members, "Stan", "仁愛醫院");
  assert.equal(next[1].group, "仁愛醫院");
  assert.equal(next[0], members[0]);
  assert.equal(members[1].group, "公司");
});

test("serializeMembers 輸出跟 members.json 同格式", () => {
  assert.deepEqual(JSON.parse(serializeMembers(members)), { members });
});

test("members.json 至少有一位管理員，名字合法不重複，群組都在選項內", async () => {
  const { members: all } = JSON.parse(await readFile(new URL("../data/members.json", import.meta.url)));
  assert.ok(all.some((m) => m.admin));
  all.reduce((list, m) => addMember(list, m.name), []);
  assert.ok(all.every((m) => GROUPS.includes(m.group)));
});
