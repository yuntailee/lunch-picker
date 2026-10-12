import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { addMember, findMember, GROUPS, removeMember, serializeMembers, setGroup } from "../members.js";

const members = [
  { name: "Kiro", admin: true, group: "公司" },
  { name: "Stan", group: "公司" },
];

test("findMember 不分大小寫、忽略前後空白", () => {
  assert.equal(findMember(members, "  kIRo ").name, "Kiro");
  assert.equal(findMember(members, "STAN").name, "Stan");
  assert.equal(findMember(members, "Nobody"), null);
  assert.equal(findMember(members, ""), null);
  assert.equal(findMember(members, null), null);
});

test("addMember 只收英文姓名，且不分大小寫不能重複", () => {
  assert.deepEqual(addMember(members, "  Mary   Jane ").at(-1), { name: "Mary Jane", group: "公司" });
  assert.throws(() => addMember(members, "stan"), /已經存在/);
  assert.throws(() => addMember(members, "小明"), /英文姓名/);
  assert.throws(() => addMember(members, "   "), /英文姓名/);
});

test("removeMember 移除指定成員", () => {
  assert.deepEqual(removeMember(members, "Stan"), [members[0]]);
});

test("setGroup 只改指定成員的單位，且只接受已知單位", () => {
  const next = setGroup(members, "Stan", "仁愛醫院");
  assert.deepEqual(next.map((m) => m.group), ["公司", "仁愛醫院"]);
  assert.equal(members[1].group, "公司", "不能改到原本的陣列");
  assert.throws(() => setGroup(members, "Stan", "火星"), /沒有「火星」/);
});

test("serializeMembers 輸出跟 members.json 同格式", () => {
  assert.deepEqual(JSON.parse(serializeMembers(members)), { members });
});

test("members.json 至少有一位管理員，名字合法不重複，單位都是已知選項", async () => {
  const { members: all } = JSON.parse(await readFile(new URL("../data/members.json", import.meta.url)));
  assert.ok(all.some((m) => m.admin));
  assert.ok(all.every((m) => GROUPS.includes(m.group)));
  all.reduce((list, m) => addMember(list, m.name), []);
});
