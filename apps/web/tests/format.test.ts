import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { priceLabel, shortVnd, timeAgo, TYPE_LABEL, vnd } from "../src/lib/format.ts";
import { PROVINCES, provinceName } from "../src/lib/provinces.ts";

const base = { priceMode: "Fixed", priceRefMin: null, priceRefMax: null, budgetMin: null, budgetMax: null, rent: null, price: null };

describe("vnd", () => {
  test("định dạng số có dấu chấm ngăn nghìn", () => assert.equal(vnd(350000), "350.000 đ"));
  test("0 đồng vẫn hiển thị", () => assert.equal(vnd(0), "0 đ"));
  test("null → chuỗi rỗng", () => assert.equal(vnd(null), ""));
  test("undefined → chuỗi rỗng", () => assert.equal(vnd(undefined), ""));
  test("số lớn", () => assert.equal(vnd(1250000000), "1.250.000.000 đ"));
});

describe("shortVnd", () => {
  test("dưới 1.000 giữ nguyên", () => assert.equal(shortVnd(500), "500đ"));
  test("nghìn → k", () => assert.equal(shortVnd(350000), "350k"));
  test("làm tròn nghìn", () => assert.equal(shortVnd(1499), "1k"));
  test("triệu", () => assert.equal(shortVnd(2000000), "2 triệu"));
  test("triệu lẻ 1 chữ số", () => assert.equal(shortVnd(2500000), "2,5 triệu"));
  test("tỷ", () => assert.equal(shortVnd(1500000000), "1,5 tỷ"));
  test("đúng 1 triệu", () => assert.equal(shortVnd(1000000), "1 triệu"));
});

describe("priceLabel", () => {
  test("tin Bán giá cố định", () => assert.equal(priceLabel({ ...base, type: "Sell", price: 350000 }), "350.000 đ"));
  test("tin Bán giá thỏa thuận hiện khoảng tham khảo", () =>
    assert.equal(priceLabel({ ...base, type: "Sell", priceMode: "Negotiable", priceRefMin: 1000000, priceRefMax: 3000000 }), "Thỏa thuận (1 triệu–3 triệu)"));
  test("tin Tặng", () => assert.equal(priceLabel({ ...base, type: "Give" }), "Tặng / trao đổi"));
  test("tin Cần mua có ngân sách", () => assert.equal(priceLabel({ ...base, type: "Buy", budgetMax: 400000 }), "Ngân sách đến 400k"));
  test("tin Cần mua không ngân sách", () => assert.equal(priceLabel({ ...base, type: "Buy" }), "Cần mua"));
  test("tin Cho thuê theo tháng", () =>
    assert.equal(priceLabel({ ...base, type: "Rent", rent: { unit: "Month", pricePerUnit: 200000, deposit: 0, minUnits: 1 } }), "200k/tháng"));
  test("tin Cho thuê mùa Tết", () =>
    assert.equal(priceLabel({ ...base, type: "Rent", rent: { unit: "TetSeason", pricePerUnit: 1500000, deposit: 0, minUnits: 1 } }), "1,5 triệu/mùa Tết"));
  test("tin Cho thuê thiếu điều khoản", () => assert.equal(priceLabel({ ...base, type: "Rent" }), "Cho thuê"));
});

describe("TYPE_LABEL", () => {
  test("đủ 4 loại tin", () => assert.deepEqual(Object.keys(TYPE_LABEL).sort(), ["Buy", "Give", "Rent", "Sell"]));
  test("nhãn tiếng Việt", () => assert.equal(TYPE_LABEL.Buy, "Cần mua"));
});

describe("timeAgo", () => {
  const ago = (sec: number) => new Date(Date.now() - sec * 1000).toISOString();
  test("rỗng", () => assert.equal(timeAgo(null), ""));
  test("vừa xong", () => assert.equal(timeAgo(ago(10)), "vừa xong"));
  test("phút", () => assert.equal(timeAgo(ago(5 * 60)), "5 phút trước"));
  test("giờ", () => assert.equal(timeAgo(ago(3 * 3600)), "3 giờ trước"));
  test("ngày", () => assert.equal(timeAgo(ago(2 * 86400)), "2 ngày trước"));
  test("quá 30 ngày hiện ngày cụ thể", () => assert.match(timeAgo(ago(40 * 86400)), /\d{1,2}\/\d{1,2}\/\d{4}/));
});

describe("provinces", () => {
  test("34 tỉnh/thành sau sáp nhập 2025", () => assert.equal(PROVINCES.length, 34));
  test("mã tỉnh không trùng", () => assert.equal(new Set(PROVINCES.map((p) => p.id)).size, PROVINCES.length));
  test("tra tên theo mã", () => assert.equal(provinceName(PROVINCES[0].id), PROVINCES[0].name));
  test("mã lạ trả lại chính mã", () => assert.equal(provinceName("zz"), "zz"));
  test("null → rỗng", () => assert.equal(provinceName(null), ""));
});
