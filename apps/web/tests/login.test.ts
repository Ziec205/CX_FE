import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isPhoneLike, safeNext } from "../src/lib/login.ts";

describe("phân luồng đăng nhập chung", () => {
  test("số di động → OTP", () => assert.equal(isPhoneLike("0912345678"), true));
  test("có khoảng trắng → OTP", () => assert.equal(isPhoneLike("0912 345 678"), true));
  test("dạng +84 → OTP", () => assert.equal(isPhoneLike("+84 912 345 678"), true));
  test("có dấu chấm → OTP", () => assert.equal(isPhoneLike("0912.345.678"), true));
  test("tên admin → mật khẩu", () => assert.equal(isPhoneLike("admin"), false));
  test("tên có số → mật khẩu", () => assert.equal(isPhoneLike("cskh01"), false));
  test("quá ngắn không phải SĐT", () => assert.equal(isPhoneLike("123"), false));
  test("khoảng trắng đầu cuối", () => assert.equal(isPhoneLike("  0912345678 "), true));
});

describe("safeNext", () => {
  test("đường dẫn nội bộ giữ nguyên", () => assert.equal(safeNext("/quan-tri/escrow"), "/quan-tri/escrow"));
  test("null → trang chủ", () => assert.equal(safeNext(null), "/"));
  test("chặn //evil.com", () => assert.equal(safeNext("//evil.com"), "/"));
  test("chặn URL tuyệt đối", () => assert.equal(safeNext("https://evil.com"), "/"));
});
