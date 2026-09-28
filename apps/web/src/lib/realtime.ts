import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { api } from "./api";

// Kết nối thẳng tới API (Vercel không proxy WebSocket). Token hub 2 phút lấy qua BFF mỗi lần (re)connect.
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";

export function createChatConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${PUBLIC_API_URL}/hubs/chat`, {
      accessTokenFactory: async () => (await api<{ token: string }>("auth/hub-token", { method: "POST" })).token,
    })
    // Mặc định SignalR bỏ cuộc sau ~30s; thử lại mãi, giãn dần tối đa 30s.
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: (ctx) => Math.min(30_000, 1000 * 2 ** ctx.previousRetryCount) })
    .configureLogging(LogLevel.Warning)
    .build();
}
