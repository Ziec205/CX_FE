import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { accessToken } from "./api";
import { API_URL } from "./config";

/** App có token riêng (SecureStore) nên dùng thẳng access token cho SignalR. */
export const createChatConnection = () =>
  new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/chat`, { accessTokenFactory: async () => (await accessToken()) ?? "" })
    // Mặc định SignalR bỏ cuộc sau ~30s; mạng di động hay chập chờn nên thử lại mãi, giãn dần tối đa 30s.
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: (ctx) => Math.min(30_000, 1000 * 2 ** ctx.previousRetryCount) })
    .configureLogging(LogLevel.Warning)
    .build();
