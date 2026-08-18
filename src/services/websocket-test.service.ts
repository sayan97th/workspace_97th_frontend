import { apiClient } from "@/lib/api-client";
import type { PingResponseDto, WebsocketStatusDto } from "@/types/websocket-test";

/**
 * Talks to `App\Http\Controllers\Admin\WebsocketTest\WebsocketTestController`
 * (workspace_97th_api).
 */
export const websocketTestService = {
  /** GET /api/admin/websocket-test/status */
  async getStatus(): Promise<WebsocketStatusDto> {
    const response = await apiClient.get<{ data: WebsocketStatusDto }>(
      "/api/admin/websocket-test/status"
    );
    return response.data;
  },

  /** POST /api/admin/websocket-test/ping */
  async sendPing(ping_id: string, client_sent_at: string): Promise<PingResponseDto> {
    const response = await apiClient.post<{ data: PingResponseDto }>(
      "/api/admin/websocket-test/ping",
      { ping_id, client_sent_at }
    );
    return response.data;
  },
};
