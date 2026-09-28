export const ORDER_STATUS: Record<string, string> = {
  AwaitingPayment: "Chờ thanh toán", AwaitingSellerConfirm: "Chờ người bán xác nhận", Paid: "Đã thanh toán — chờ gửi", Shipping: "Đang giao",
  Delivered: "Đã giao — đang kiểm tra", Disputed: "Đang khiếu nại", AwaitingReturn: "Chờ trả hàng", Completed: "Hoàn thành",
  PartiallyRefunded: "Hoàn tiền một phần", Refunded: "Đã hoàn tiền", Settled: "Đã quyết toán", Cancelled: "Đã hủy", CancelledRefunded: "Đã hủy — hoàn 100%",
};

export const DELIVERY: Record<string, string> = {
  SellerDelivery: "Người bán tự giao", BuyerPickup: "Nhận tại vườn", SelfArrangedCarrier: "Gửi xe / chành xe", PlatformCarrier: "Giao qua Chạm Xanh",
};
