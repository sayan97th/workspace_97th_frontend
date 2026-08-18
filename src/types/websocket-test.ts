/**
 * Shape returned by `App\Http\Controllers\Admin\WebsocketTest\WebsocketTestController::status()`
 * (workspace_97th_api).
 */
export type WebsocketStatusDto = {
  broadcast_driver: string;
  is_reverb_driver: boolean;
  reverb: {
    app_key: string;
    host: string;
    port: number;
    scheme: string;
  };
  server_reachable: boolean;
  checked_at: string;
};

/**
 * Shape returned by `WebsocketTestController::ping()`, confirming the HTTP
 * request was received and a broadcast was dispatched. Does not by itself
 * prove delivery, the pong event below is what confirms that.
 */
export type PingResponseDto = {
  ping_id: string;
  broadcast_driver: string;
  dispatched_at: string;
  channel: string;
};

/**
 * Shape of the `websocket_test_pong` event pushed on the private
 * `websocket-test.{user_id}` channel by `App\Events\WebsocketTestPong`.
 */
export type PongEventDto = {
  ping_id: string;
  client_sent_at: string | null;
  server_sent_at: string;
};

/** Mirrors Pusher/Echo's connection states, surfaced by `useWebsocketDiagnostics`. */
export type EchoConnectionState =
  | "initialized"
  | "connecting"
  | "connected"
  | "unavailable"
  | "failed"
  | "disconnected";

export type PingLogStatus = "pending" | "received" | "timed_out";

export type PingLogEntry = {
  ping_id: string;
  sent_at: number;
  status: PingLogStatus;
  latency_ms: number | null;
};

export type DiagnosticLogEntry = {
  id: string;
  at: number;
  level: "info" | "success" | "warning" | "error";
  message: string;
};
