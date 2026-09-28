import { createHmac } from "node:crypto";
import { API_URL } from "@/lib/session";

/** CHỈ DÙNG KHI PHÁT TRIỂN: giả lập cổng thanh toán gọi webhook để thử luồng nạp Xu và Giao dịch đảm bảo.
 *  Tắt hoàn toàn ở production hoặc khi không đặt DEV_PAYMENT_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const secret = process.env.DEV_PAYMENT_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === "production" || !secret) return new Response("Not found", { status: 404 });
  const { topUpId, orderId, amountVnd } = (await req.json()) as { topUpId?: string; orderId?: string; amountVnd: number };
  const [path, raw] = orderId
    ? ["/api/escrow/webhook", JSON.stringify({ orderId, status: "PAID", amountVnd, gatewayRef: `DEV-${orderId}` })]
    : ["/api/payments/webhook", JSON.stringify({ topUpId, status: "PAID", amountVnd, gatewayRef: `DEV-${topUpId}` })];
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Signature": signature }, body: raw,
  });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
}
