import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  addMember,
  findMember,
  GROUPS,
  locationsForGroup,
  matchMember,
  openRoster,
  removeMember,
  serializeMembers,
  setGroup,
  toDirectory,
} from "../members.js";

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

test("locationsForGroup 只回該群組的地點，沒爬過的改走即時搜尋", () => {
  const configLocations = [
    { name: "內湖", group: "公司" },
    { name: "板橋 TPKC", group: "公司" },
    { name: "仁愛醫院", group: "仁愛醫院", lat: 25.03724, lng: 121.54517 },
  ];
  const crawled = [
    { name: "內湖", restaurants: [{ name: "A" }] },
    { name: "板橋 TPKC", restaurants: [{ name: "B" }] },
  ];
  const danny = locationsForGroup(configLocations, crawled, "仁愛醫院", ["飯"]);
  assert.deepEqual(danny.map((l) => l.name), ["仁愛醫院"]);
  assert.equal(danny[0].restaurants, null);
  assert.deepEqual(danny[0].tags, ["飯"]);
  assert.deepEqual(
    locationsForGroup(configLocations, crawled, "公司").map((l) => l.name),
    ["內湖", "板橋 TPKC"],
  );
});

test("serializeMembers 輸出成 { members } 的 JSON", () => {
  assert.deepEqual(JSON.parse(serializeMembers(members)), { members });
});

test("matchMember 用 hash 找回群組，回傳的是打進去的姓名", async () => {
  const directory = await toDirectory(members, "test-secret");
  assert.equal(JSON.stringify(directory.members).includes("Kiro"), false);
  assert.equal((await matchMember(directory.members, "  kIRo ")).name, "Kiro");
  assert.equal((await matchMember(directory.members, "  kIRo ")).group, "公司");
  assert.equal((await matchMember(directory.members, "  kIRo ")).admin, true);
  assert.equal(await matchMember(directory.members, "Nobody"), null);
  assert.equal(await matchMember(directory.members, ""), null);
});

test("toDirectory 的名單密碼可以還原姓名，密碼錯誤就失敗", async () => {
  const directory = await toDirectory(members, "test-secret");
  assert.deepEqual(await openRoster(directory.roster, "test-secret"), members);
  await assert.rejects(openRoster(directory.roster, "wrong"));
});

test("members.json 給網頁下載的內容沒有姓名", async () => {
  const directory = JSON.parse(await readFile(new URL("../data/members.json", import.meta.url)));
  assert.equal(typeof directory.roster, "string");
  assert.ok(directory.members.some((m) => m.admin));
  assert.ok(directory.members.every((m) => /^[0-9a-f]{64}$/.test(m.hash)));
  assert.ok(directory.members.every((m) => m.name === undefined && GROUPS.includes(m.group)));
});
