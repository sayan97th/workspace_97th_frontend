"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { getEcho, resetEcho } from "@/lib/echo";
import { websocketTestService } from "@/services/websocket-test.service";
import type {
  DiagnosticLogEntry,
  EchoConnectionState,
  PingLogEntry,
  PongEventDto,
  WebsocketStatusDto,
} from "@/types/websocket-test";

/** How long a ping waits for its pong before it's marked timed out. */
const PING_TIMEOUT_MS = 8000;

/** Caps how many rows the diagnostic log keeps, oldest entries drop off first. */
const MAX_LOG_ENTRIES = 100;

function makePingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ping-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Drives the admin "Websocket test" screen: tracks the Echo/Reverb
 * connection's live state, fetches the server-side broadcasting status, and
 * round-trips ping/pong events over the private `websocket-test.{user_id}`
 * channel so a real end-to-end delivery can be timed and verified from the
 * browser, not just assumed from a green HTTP response.
 */
export function useWebsocketDiagnostics() {
  const { user } = useAuth();

  const [connection_state, setConnectionState] = useState<EchoConnectionState>("initialized");
  const [socket_id, setSocketId] = useState<string | null>(null);
  const [status, setStatus] = useState<WebsocketStatusDto | null>(null);
  const [is_status_loading, setIsStatusLoading] = useState(true);
  const [status_error, setStatusError] = useState<string | null>(null);
  const [pings, setPings] = useState<PingLogEntry[]>([]);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [reconnect_nonce, setReconnectNonce] = useState(0);

  const timeout_handles = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const pushLog = useCallback((level: DiagnosticLogEntry["level"], message: string) => {
    setLogs((previous) => {
      const entry: DiagnosticLogEntry = {
        id: makePingId(),
        at: Date.now(),
        level,
        message,
      };
      const next = [entry, ...previous];
      return next.length > MAX_LOG_ENTRIES ? next.slice(0, MAX_LOG_ENTRIES) : next;
    });
  }, []);

  const loadStatus = useCallback(async () => {
    setIsStatusLoading(true);
    setStatusError(null);
    try {
      const data = await websocketTestService.getStatus();
      setStatus(data);
      pushLog(
        data.is_reverb_driver && data.server_reachable ? "success" : "warning",
        `Server status: broadcast driver is "${data.broadcast_driver}", Reverb ${data.server_reachable ? "reachable" : "unreachable"} at ${data.reverb.host}:${data.reverb.port}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load server status.";
      setStatusError(message);
      pushLog("error", `Failed to load server status: ${message}`);
    } finally {
      setIsStatusLoading(false);
    }
  }, [pushLog]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── Echo connection lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    const echo = getEcho(token);
    const pusher_connection = echo.connector.pusher.connection;

    setConnectionState(pusher_connection.state as EchoConnectionState);
    setSocketId(pusher_connection.socket_id ?? null);

    const handleStateChange = ({ current }: { previous: string; current: string }) => {
      setConnectionState(current as EchoConnectionState);
      setSocketId(pusher_connection.socket_id ?? null);
      pushLog(current === "connected" ? "success" : current === "failed" ? "error" : "info", `Connection state changed to "${current}".`);
    };

    const handleConnectionError = (error: unknown) => {
      pushLog("error", `Connection error: ${JSON.stringify(error)}`);
    };

    pusher_connection.bind("state_change", handleStateChange);
    pusher_connection.bind("error", handleConnectionError);

    const channel_name = `websocket-test.${user.id}`;
    const channel = echo
      .private(channel_name)
      .listen(".websocket_test_pong", (payload: PongEventDto) => {
        const received_at = Date.now();

        setPings((previous) =>
          previous.map((entry) => {
            if (entry.ping_id !== payload.ping_id || entry.status !== "pending") return entry;
            return { ...entry, status: "received", latency_ms: received_at - entry.sent_at };
          })
        );

        const handle = timeout_handles.current.get(payload.ping_id);
        if (handle) {
          clearTimeout(handle);
          timeout_handles.current.delete(payload.ping_id);
        }

        pushLog("success", `Pong received for ping ${payload.ping_id.slice(0, 8)}.`);
      })
      .error((error: unknown) => {
        pushLog("error", `Channel subscription error on "${channel_name}": ${JSON.stringify(error)}`);
      });

    pushLog("info", `Subscribing to private channel "${channel_name}".`);

    return () => {
      pusher_connection.unbind("state_change", handleStateChange);
      pusher_connection.unbind("error", handleConnectionError);
      channel.stopListening(".websocket_test_pong");
      echo.leave(channel_name);
    };
  }, [user, pushLog, reconnect_nonce]);

  useEffect(() => {
    const handles = timeout_handles.current;
    return () => {
      handles.forEach((handle) => clearTimeout(handle));
      handles.clear();
    };
  }, []);

  const sendPing = useCallback(async () => {
    if (!user) return;

    const ping_id = makePingId();
    const sent_at = Date.now();
    const client_sent_at = new Date(sent_at).toISOString();

    setPings((previous) => [{ ping_id, sent_at, status: "pending", latency_ms: null }, ...previous]);
    pushLog("info", `Sending ping ${ping_id.slice(0, 8)}...`);

    const timeout_handle = setTimeout(() => {
      setPings((previous) =>
        previous.map((entry) =>
          entry.ping_id === ping_id && entry.status === "pending"
            ? { ...entry, status: "timed_out" }
            : entry
        )
      );
      timeout_handles.current.delete(ping_id);
      pushLog("warning", `Ping ${ping_id.slice(0, 8)} timed out after ${PING_TIMEOUT_MS / 1000}s, no pong arrived over the socket.`);
    }, PING_TIMEOUT_MS);
    timeout_handles.current.set(ping_id, timeout_handle);

    try {
      await websocketTestService.sendPing(ping_id, client_sent_at);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send ping.";
      pushLog("error", `Failed to dispatch ping ${ping_id.slice(0, 8)}: ${message}`);

      const handle = timeout_handles.current.get(ping_id);
      if (handle) {
        clearTimeout(handle);
        timeout_handles.current.delete(ping_id);
      }
      setPings((previous) => previous.filter((entry) => entry.ping_id !== ping_id));
    }
  }, [user, pushLog]);

  const reconnect = useCallback(() => {
    pushLog("info", "Reconnecting websocket client...");
    resetEcho();
    setPings([]);
    timeout_handles.current.forEach((handle) => clearTimeout(handle));
    timeout_handles.current.clear();
    setReconnectNonce((previous) => previous + 1);
  }, [pushLog]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    connection_state,
    socket_id,
    status,
    is_status_loading,
    status_error,
    pings,
    logs,
    reloadStatus: loadStatus,
    sendPing,
    reconnect,
    clearLogs,
  };
}
