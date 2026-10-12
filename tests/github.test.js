import assert from "node:assert/strict";
import test from "node:test";
import { toBase64 } from "../github.js";

test("toBase64 以 UTF-8 編碼，中文也能還原", () => {
  const text = '{ "name": "Kiro 管理員" }\n';
  assert.equal(Buffer.from(toBase64(text), "base64").toString("utf8"), text);
});
