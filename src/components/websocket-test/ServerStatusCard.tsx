import React from "react";
import { CheckCircleIcon, RefreshIcon, ServerIcon, XCircleIcon } from "./icons";
import { TONE_CLASSES } from "./status-meta";
import type { WebsocketStatusDto } from "@/types/websocket-test";

type ServerStatusCardProps = {
  status: WebsocketStatusDto | null;
  is_loading: boolean;
  error: string | null;
  onReload: () => void;
};

const ServerStatusCard: React.FC<ServerStatusCardProps> = ({ status, is_loading, error, onReload }) => {
  const tone = status
    ? TONE_CLASSES[status.is_reverb_driver && status.server_reachable ? "success" : "error"]
    : TONE_CLASSES.neutral;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-shell-text-secondary">
          <ServerIcon size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Server broadcasting</span>
        </div>
        <button
          type="button"
          onClick={onReload}
          disabled={is_loading}
          className="flex items-center gap-1.5 rounded-lg border border-shell-border px-2.5 py-1.5 text-xs font-medium text-shell-text-secondary transition hover:bg-shell-hover hover:text-shell-text disabled:opacity-50"
        >
          <RefreshIcon size={13} className={is_loading ? "animate-spin" : ""} />
          Reload
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-error-300 bg-error-50 px-3 py-2 text-xs text-error-600">{error}</div>
      )}

      {!error && !status && (
        <div className="text-sm text-shell-text-secondary">Loading server status…</div>
      )}

      {status && (
        <>
          <div className="flex items-center gap-3">
            {status.is_reverb_driver && status.server_reachable ? (
              <CheckCircleIcon size={20} className={tone.text} />
            ) : (
              <XCircleIcon size={20} className={tone.text} />
            )}
            <span className={`text-lg font-semibold ${tone.text}`}>
              {status.is_reverb_driver && status.server_reachable ? "Broadcasting live" : "Not broadcasting"}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-y-2 rounded-lg bg-shell-panel-alt px-3 py-2.5 text-xs">
            <dt className="text-shell-text-secondary">Broadcast driver</dt>
            <dd className={`text-right font-mono font-medium ${status.is_reverb_driver ? "text-shell-text" : "text-error-600"}`}>
              {status.broadcast_driver}
            </dd>

            <dt className="text-shell-text-secondary">Reverb reachable</dt>
            <dd className={`text-right font-medium ${status.server_reachable ? "text-success-600" : "text-error-600"}`}>
              {status.server_reachable ? "Yes" : "No"}
            </dd>

            <dt className="text-shell-text-secondary">Host</dt>
            <dd className="text-right font-mono text-shell-text">{status.reverb.host || "—"}</dd>

            <dt className="text-shell-text-secondary">Port</dt>
            <dd className="text-right font-mono text-shell-text">{status.reverb.port || "—"}</dd>

            <dt className="text-shell-text-secondary">Scheme</dt>
            <dd className="text-right font-mono text-shell-text">{status.reverb.scheme || "—"}</dd>
          </dl>

          {!status.is_reverb_driver && (
            <p className="text-xs text-error-600">
              The server's BROADCAST_CONNECTION is not set to "reverb", events are not being sent over the socket at all.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ServerStatusCard;
