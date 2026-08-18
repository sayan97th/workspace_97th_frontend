import React from "react";
import { PlugIcon, RefreshIcon } from "./icons";
import { CONNECTION_STATE_META, TONE_CLASSES } from "./status-meta";
import type { EchoConnectionState } from "@/types/websocket-test";

type ConnectionStatusCardProps = {
  connection_state: EchoConnectionState;
  socket_id: string | null;
  onReconnect: () => void;
};

const ConnectionStatusCard: React.FC<ConnectionStatusCardProps> = ({
  connection_state,
  socket_id,
  onReconnect,
}) => {
  const meta = CONNECTION_STATE_META[connection_state];
  const tone = TONE_CLASSES[meta.tone];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-shell-text-secondary">
          <PlugIcon size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Browser connection</span>
        </div>
        <button
          type="button"
          onClick={onReconnect}
          className="flex items-center gap-1.5 rounded-lg border border-shell-border px-2.5 py-1.5 text-xs font-medium text-shell-text-secondary transition hover:bg-shell-hover hover:text-shell-text"
        >
          <RefreshIcon size={13} />
          Reconnect
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className={`relative flex h-3 w-3 items-center justify-center`}>
          <span className={`absolute h-3 w-3 rounded-full ${tone.dot} ${connection_state === "connecting" ? "animate-ping opacity-75" : ""}`} />
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        </span>
        <span className={`text-lg font-semibold ${tone.text}`}>{meta.label}</span>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-shell-panel-alt px-3 py-2 text-xs text-shell-text-secondary">
        <span>Socket ID</span>
        <span className="font-mono text-shell-text">{socket_id || "—"}</span>
      </div>
    </div>
  );
};

export default ConnectionStatusCard;
