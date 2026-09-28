export const ORDER_LABEL: Record<string, string> = {
  AwaitingPayment: "Chờ thanh toán", AwaitingSellerConfirm: "Chờ người bán xác nhận", Paid: "Đã thanh toán", Shipping: "Đang giao",
  Delivered: "Đã giao", Disputed: "Khiếu nại", AwaitingReturn: "Chờ trả hàng", Completed: "Hoàn thành", PartiallyRefunded: "Hoàn một phần",
  Refunded: "Đã hoàn tiền", Settled: "Đã quyết toán", Cancelled: "Đã hủy", CancelledRefunded: "Hủy + hoàn 100%",
};

export const DISPUTE_REASON: Record<string, string> = {
  NotReceived: "Không nhận được hàng", DeadOrWilted: "Cây chết / héo nặng", DamagedInTransit: "Gãy, dập do vận chuyển",
  WrongSpecies: "Sai loài / sai giống", WrongSize: "Sai kích thước", MissingQuantity: "Thiếu số lượng", Other: "Khác",
};
