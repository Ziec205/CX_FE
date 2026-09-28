import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { composeDateTime, defaultFirstReminder, KIND_LABEL, repeatText, toLocalInput, upcomingReminders } from "../src/lib/garden.ts";
import { paragraphs, paramsToSavedQuery, responseText, savedQueryToHref, splitTopics } from "../src/lib/search.ts";
import type { CareReminder } from "../src/lib/types.ts";

const r = (p: Partial<CareReminder>): CareReminder => ({
  id: "r", plantId: "p", kind: "Watering", anchorAt: "2026-01-01T00:00:00Z", repeat: "Daily", interval: 1, enabled: true, nextAt: null, ...p,
});

describe("repeatText", () => {
  test("một lần", () => assert.equal(repeatText({ repeat: "None", interval: 1 }), "Một lần"));
  test("hằng ngày", () => assert.equal(repeatText({ repeat: "Daily", interval: 1 }), "Hằng ngày"));
  test("hằng tuần", () => assert.equal(repeatText({ repeat: "Weekly", interval: 1 }), "Hằng tuần"));
  test("hằng tháng", () => assert.equal(repeatText({ repeat: "Monthly", interval: 1 }), "Hằng tháng"));
  test("hằng năm", () => assert.equal(repeatText({ repeat: "Yearly", interval: 1 }), "Hằng năm"));
  test("mỗi 3 ngày", () => assert.equal(repeatText({ repeat: "Daily", interval: 3 }), "Mỗi 3 ngày"));
  test("mỗi 2 tuần", () => assert.equal(repeatText({ repeat: "Weekly", interval: 2 }), "Mỗi 2 tuần"));
  test("một lần bỏ qua interval", () => assert.equal(repeatText({ repeat: "None", interval: 5 }), "Một lần"));
});

describe("KIND_LABEL", () => {
  test("đủ 5 loại việc", () => assert.equal(Object.keys(KIND_LABEL).length, 5));
  test("tưới cây", () => assert.equal(KIND_LABEL.Watering, "Tưới cây"));
});

describe("toLocalInput / defaultFirstReminder", () => {
  test("định dạng yyyy-MM-ddTHH:mm có số 0 đứng trước", () => assert.equal(toLocalInput(new Date(2026, 0, 5, 7, 3)), "2026-01-05T07:03"));
  test("cuối năm", () => assert.equal(toLocalInput(new Date(2026, 11, 31, 23, 59)), "2026-12-31T23:59"));
  test("mặc định 7h sáng ngày mai", () => {
    const d = defaultFirstReminder(new Date(2026, 4, 10, 15, 30));
    assert.equal(toLocalInput(d), "2026-05-11T07:00");
  });
  test("qua tháng", () => assert.equal(toLocalInput(defaultFirstReminder(new Date(2026, 0, 31, 9))), "2026-02-01T07:00"));
  test("qua năm", () => assert.equal(toLocalInput(defaultFirstReminder(new Date(2026, 11, 31, 9))), "2027-01-01T07:00"));
});

describe("composeDateTime (giờ-ngày-tháng-năm)", () => {
  test("hợp lệ", () => assert.equal(toLocalInput(composeDateTime("7", "30", "1", "10", "2026")!), "2026-10-01T07:30"));
  test("0 giờ 0 phút", () => assert.equal(toLocalInput(composeDateTime("0", "00", "15", "6", "2026")!), "2026-06-15T00:00"));
  test("31/02 không có thật", () => assert.equal(composeDateTime("7", "0", "31", "2", "2026"), null));
  test("29/02 năm nhuận hợp lệ", () => assert.notEqual(composeDateTime("7", "0", "29", "2", "2028"), null));
  test("29/02 năm thường không hợp lệ", () => assert.equal(composeDateTime("7", "0", "29", "2", "2027"), null));
  test("giờ 24 không hợp lệ", () => assert.equal(composeDateTime("24", "0", "1", "1", "2026"), null));
  test("phút 60 không hợp lệ", () => assert.equal(composeDateTime("7", "60", "1", "1", "2026"), null));
  test("tháng 13 không hợp lệ", () => assert.equal(composeDateTime("7", "0", "1", "13", "2026"), null));
  test("ngày 0 không hợp lệ", () => assert.equal(composeDateTime("7", "0", "0", "1", "2026"), null));
  test("chữ không hợp lệ", () => assert.equal(composeDateTime("bảy", "0", "1", "1", "2026"), null));
  test("ô trống không hợp lệ", () => assert.equal(composeDateTime("", "0", "1", "1", "2026"), null));
  test("năm quá xa không hợp lệ", () => assert.equal(composeDateTime("7", "0", "1", "1", "3000"), null));
});

describe("upcomingReminders", () => {
  const plants = [
    { name: "Trầu bà", reminders: [r({ id: "a", nextAt: "2026-10-03T00:00:00Z" }), r({ id: "b", nextAt: "2026-10-01T00:00:00Z", enabled: false })] },
    { name: "Sen đá", reminders: [r({ id: "c", nextAt: "2026-10-02T00:00:00Z" }), r({ id: "d", nextAt: null })] },
  ];
  test("chỉ lấy lời nhắc đang bật và có lần tới", () => assert.deepEqual(upcomingReminders(plants).map((x) => x.id), ["c", "a"]));
  test("gắn tên cây", () => assert.equal(upcomingReminders(plants)[0].plantName, "Sen đá"));
  test("giới hạn số lượng", () => assert.equal(upcomingReminders(plants, 1).length, 1));
  test("vườn trống", () => assert.deepEqual(upcomingReminders([]), []));
});

describe("lưu tìm kiếm", () => {
  test("chuyển số và boolean đúng kiểu", () => {
    const q = paramsToSavedQuery({ q: "sen da", priceMin: "100000", gardenOnly: "true", escrowOnly: "false" });
    assert.deepEqual(q, { page: 1, pageSize: 24, q: "sen da", priceMin: 100000, gardenOnly: true, escrowOnly: false });
  });
  test("gom thuộc tính động attr.*", () => assert.deepEqual(paramsToSavedQuery({ "attr.chieuCao": "120" }).attr, { chieuCao: "120" }));
  test("bỏ page/pageSize từ URL", () => assert.equal(paramsToSavedQuery({ page: "5" }).page, 1));
  test("bỏ giá trị rỗng", () => assert.equal("q" in paramsToSavedQuery({ q: "" }), false));
  test("không có attr thì không tạo khóa attr", () => assert.equal("attr" in paramsToSavedQuery({ q: "x" }), false));
  test("tọa độ là số", () => assert.equal(paramsToSavedQuery({ lat: "10.5" }).lat, 10.5));
  test("đường dẫn ngược lại trang tìm kiếm", () =>
    assert.equal(savedQueryToHref({ page: 1, pageSize: 24, q: "mai vang", gardenOnly: true, attr: { chieuCao: "120" } }), "/tim-kiem?q=mai+vang&gardenOnly=true&attr.chieuCao=120"));
  test("khứ hồi giữ nguyên bộ lọc", () => {
    const href = savedQueryToHref(paramsToSavedQuery({ q: "bonsai", provinceId: "79", "attr.dang": "Trực" }));
    assert.deepEqual(Object.fromEntries(new URLSearchParams(href.split("?")[1])), { q: "bonsai", provinceId: "79", "attr.dang": "Trực" });
  });
  test("bỏ null", () => assert.equal(savedQueryToHref({ q: null, type: "Sell" }), "/tim-kiem?type=Sell"));
});

describe("responseText", () => {
  test("chưa có dữ liệu", () => assert.equal(responseText(null), "Chưa đủ dữ liệu phản hồi"));
  test("tỉ lệ null", () => assert.equal(responseText({ responseRate: null }), "Chưa đủ dữ liệu phản hồi"));
  test("phút", () => assert.equal(responseText({ responseRate: 0.9, avgResponseMinutes: 12 }), "Phản hồi 90% tin nhắn · thường trong 12 phút"));
  test("giờ", () => assert.equal(responseText({ responseRate: 1, avgResponseMinutes: 150 }), "Phản hồi 100% tin nhắn · thường trong 3 giờ"));
  test("ngày", () => assert.equal(responseText({ responseRate: 0.5, avgResponseMinutes: 2880 }), "Phản hồi 50% tin nhắn · thường trong 2 ngày"));
});

describe("paragraphs / splitTopics", () => {
  test("tách theo dòng trống", () => assert.deepEqual(paragraphs("a\n\nb\n  \nc"), ["a", "b", "c"]));
  test("xuống dòng đơn không tách", () => assert.deepEqual(paragraphs("a\nb"), ["a\nb"]));
  test("null", () => assert.deepEqual(paragraphs(null), []));
  test("tách chủ đề, bỏ trống", () => assert.deepEqual(splitTopics("bonsai, sen đá, ,"), ["bonsai", "sen đá"]));
  test("bỏ trùng", () => assert.deepEqual(splitTopics("a,a, a"), ["a"]));
});
