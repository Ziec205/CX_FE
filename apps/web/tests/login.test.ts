import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { safeNext } from "../src/lib/login.ts";

describe("safeNext", () => {
  test("đường dẫn nội bộ giữ nguyên", () => assert.equal(safeNext("/quan-tri/members"), "/quan-tri/members"));
  test("null → trang chủ", () => assert.equal(safeNext(null), "/"));
  test("chặn //evil.com", () => assert.equal(safeNext("//evil.com"), "/"));
  test("chặn URL tuyệt đối", () => assert.equal(safeNext("https://evil.com"), "/"));
});
