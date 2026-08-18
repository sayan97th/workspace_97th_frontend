"use client";

import React from "react";
import ClientConfigCard from "./ClientConfigCard";
import ConnectionStatusCard from "./ConnectionStatusCard";
import DiagnosticLogPanel from "./DiagnosticLogPanel";
import { RadarIcon } from "./icons";
import PingTesterCard from "./PingTesterCard";
import ServerStatusCard from "./ServerStatusCard";
import { useWebsocketDiagnostics } from "@/hooks/useWebsocketDiagnostics";

/**
 * Admin diagnostic screen at /test/websocket. Verifies the full Reverb
 * websocket path end to end: the browser's connection state, the server's
 * broadcast configuration and Reverb reachability, and a real ping/pong
 * round trip, so a production "websocket doesn't work" report can be
 * narrowed down without digging through server logs.
 */
const WebsocketTestView: React.FC = () => {
  const {
    connection_state,
    socket_id,
    status,
    is_status_loading,
    status_error,
    pings,
    logs,
    reloadStatus,
    sendPing,
    reconnect,
    clearLogs,
  } = useWebsocketDiagnostics();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
          <RadarIcon size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-shell-text">Websocket diagnostics</h1>
          <p className="text-sm text-shell-text-secondary">
            Verify the Reverb connection, server broadcast configuration, and a live ping/pong round trip.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <ConnectionStatusCard connection_state={connection_state} socket_id={socket_id} onReconnect={reconnect} />
        <ServerStatusCard status={status} is_loading={is_status_loading} error={status_error} onReload={reloadStatus} />
        <ClientConfigCard status={status} />
      </div>

      <PingTesterCard pings={pings} is_connected={connection_state === "connected"} onSendPing={sendPing} />

      <DiagnosticLogPanel logs={logs} onClear={clearLogs} />
    </div>
  );
};

export default WebsocketTestView;
