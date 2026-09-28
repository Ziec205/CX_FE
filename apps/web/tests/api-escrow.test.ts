import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { api, errorText, newIdempotencyKey, type ApiError } from "../src/lib/api.ts";
import { DELIVERY, DISPUTE_REASON, ORDER_STATUS, TONE_CLASS } from "../src/lib/escrow.ts";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function mockFetch(status: number, body: unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

describe("api() qua BFF", () => {
  test("gọi /api/proxy và trả JSON", async () => {
    const calls = mockFetch(200, { ok: 1 });
    assert.deepEqual(await api("me"), { ok: 1 });
    assert.equal(calls[0].url, "/api/proxy/me");
  });
  test("bỏ dấu / đầu đường dẫn", async () => {
    const calls = mockFetch(200, {});
    await api("/listings");
    assert.equal(calls[0].url, "/api/proxy/listings");
  });
  test("json → body chuỗi + Content-Type", async () => {
    const calls = mockFetch(200, {});
    await api("x", { method: "POST", json: { a: 1 } });
    assert.equal(calls[0].init?.body, '{"a":1}');
    assert.equal((calls[0].init?.headers as Record<string, string>)["Content-Type"], "application/json");
  });
  test("không cache", async () => {
    const calls = mockFetch(200, {});
    await api("x");
    assert.equal(calls[0].init?.cache, "no-store");
  });
  test("204 → null", async () => {
    mockFetch(204, undefined);
    assert.equal(await api("x", { method: "DELETE" }), null);
  });
  test("lỗi nghiệp vụ giữ mã và thông điệp", async () => {
    mockFetch(422, { code: "TIME_IN_PAST", message: "Thời điểm nhắc đã qua" });
    await assert.rejects(api("x"), (e: ApiError) => e.code === "TIME_IN_PAST" && e.status === 422 && e.message === "Thời điểm nhắc đã qua");
  });
  test("401 không có body → yêu cầu đăng nhập", async () => {
    mockFetch(401, undefined);
    await assert.rejects(api("x"), (e: ApiError) => e.message === "Vui lòng đăng nhập" && e.code === "401");
  });
  test("403 không có body → không có quyền", async () => {
    mockFetch(403, undefined);
    await assert.rejects(api("x"), (e: ApiError) => e.message.includes("không có quyền"));
  });
  test("500 không có body → lỗi chung", async () => {
    mockFetch(500, undefined);
    await assert.rejects(api("x"), (e: ApiError) => e.message === "Có lỗi xảy ra");
  });
});

describe("errorText", () => {
  test("thông điệp đơn", () => assert.equal(errorText({ message: "Hết hàng" }), "Hết hàng"));
  test("gộp danh sách lỗi chuỗi", () => assert.equal(errorText({ message: "Hồ sơ chưa hợp lệ", details: ["Thiếu địa chỉ", "Sai CCCD"] }), "Hồ sơ chưa hợp lệ: Thiếu địa chỉ; Sai CCCD"));
  test("gộp danh sách lỗi dạng object", () => assert.equal(errorText({ message: "Lỗi", details: [{ field: "title", message: "Quá ngắn" }] }), "Lỗi: Quá ngắn"));
  test("không có message", () => assert.equal(errorText({}), "Có lỗi xảy ra"));
});

describe("newIdempotencyKey", () => {
  test("mỗi lần một khóa khác", () => assert.notEqual(newIdempotencyKey(), newIdempotencyKey()));
  test("khóa không rỗng", () => assert.ok(newIdempotencyKey().length >= 10));
});

describe("nhãn Giao dịch đảm bảo", () => {
  const statuses = ["AwaitingPayment", "AwaitingSellerConfirm", "Paid", "Shipping", "Delivered", "Disputed", "AwaitingReturn",
    "Completed", "PartiallyRefunded", "Refunded", "Settled", "Cancelled", "CancelledRefunded"];
  test("đủ 13 trạng thái khớp BE", () => assert.deepEqual(Object.keys(ORDER_STATUS).sort(), [...statuses].sort()));
  test("mọi trạng thái có tông màu hợp lệ", () => assert.ok(Object.values(ORDER_STATUS).every((s) => s.tone in TONE_CLASS)));
  test("khiếu nại là tông đỏ", () => assert.equal(ORDER_STATUS.Disputed.tone, "bad"));
  test("hoàn thành là tông xanh", () => assert.equal(ORDER_STATUS.Completed.tone, "ok"));
  test("4 hình thức giao nhận", () => assert.equal(Object.keys(DELIVERY).length, 4));
  test("nhận tại vườn nhắc mã QR", () => assert.match(DELIVERY.BuyerPickup.hint, /mã QR/));
  test("7 lý do khiếu nại", () => assert.equal(Object.keys(DISPUTE_REASON).length, 7));
  test("có lý do không nhận được hàng", () => assert.equal(DISPUTE_REASON.NotReceived, "Không nhận được hàng"));
});
