import type { DeliveryMethod, OrderStatus } from "./types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "wait" | "go" | "ok" | "bad" }> = {
  AwaitingPayment: { label: "Chờ thanh toán", tone: "wait" },
  AwaitingSellerConfirm: { label: "Chờ người bán xác nhận", tone: "wait" },
  Paid: { label: "Đã thanh toán — chờ gửi", tone: "go" },
  Shipping: { label: "Đang giao", tone: "go" },
  Delivered: { label: "Đã giao — đang kiểm tra", tone: "go" },
  Disputed: { label: "Đang khiếu nại", tone: "bad" },
  AwaitingReturn: { label: "Chờ trả hàng", tone: "bad" },
  Completed: { label: "Hoàn thành", tone: "ok" },
  PartiallyRefunded: { label: "Hoàn tiền một phần", tone: "ok" },
  Refunded: { label: "Đã hoàn tiền", tone: "bad" },
  Settled: { label: "Đã quyết toán", tone: "ok" },
  Cancelled: { label: "Đã hủy", tone: "bad" },
  CancelledRefunded: { label: "Đã hủy — hoàn 100%", tone: "bad" },
};

export const TONE_CLASS = {
  wait: "bg-wood-100 text-wood-800", go: "bg-sky-50 text-sky-800", ok: "bg-emerald-50 text-emerald-800", bad: "bg-red-50 text-red-800",
};

export const DELIVERY: Record<DeliveryMethod, { label: string; hint: string }> = {
  SellerDelivery: { label: "Người bán tự giao", hint: "Người bán mang cây tới, chụp ảnh khi giao. Bạn có 48 giờ kiểm tra." },
  BuyerPickup: { label: "Nhận tại vườn", hint: "Xem cây tận mắt; đưa mã QR cho người bán quét khi nhận." },
  SelfArrangedCarrier: { label: "Gửi xe / chành xe", hint: "Người bán gửi xe khách hoặc chành xe; bạn báo đã nhận khi lấy hàng." },
  PlatformCarrier: { label: "Giao qua Chạm Xanh", hint: "Sắp ra mắt" },
};

export const DISPUTE_REASON: Record<string, string> = {
  NotReceived: "Không nhận được hàng", DeadOrWilted: "Cây chết / héo nặng", DamagedInTransit: "Gãy, dập do vận chuyển",
  WrongSpecies: "Sai loài / sai giống", WrongSize: "Sai kích thước", MissingQuantity: "Thiếu số lượng", Other: "Khác",
};
