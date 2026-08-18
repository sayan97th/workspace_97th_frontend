import React from "react";
import { CheckCircleIcon, ClockIcon, SendIcon, XCircleIcon } from "./icons";
import type { PingLogEntry } from "@/types/websocket-test";

type PingTesterCardProps = {
  pings: PingLogEntry[];
  is_connected: boolean;
  onSendPing: () => void;
};

const STATUS_META: Record<PingLogEntry["status"], { label: string; className: string }> = {
  pending: { label: "Waiting", className: "text-warning-600" },
  received: { label: "Received", className: "text-success-600" },
  timed_out: { label: "Timed out", className: "text-error-600" },
};

function StatusIcon({ status }: { status: PingLogEntry["status"] }) {
  if (status === "received") return <CheckCircleIcon size={16} className="text-success-500" />;
  if (status === "timed_out") return <XCircleIcon size={16} className="text-error-500" />;
  return <ClockIcon size={16} className="animate-pulse text-warning-500" />;
}

const PingTesterCard: React.FC<PingTesterCardProps> = ({ pings, is_connected, onSendPing }) => {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-shell-text">Round-trip ping test</h3>
          <p className="mt-0.5 text-xs text-shell-text-secondary">
            Sends an HTTP request that triggers a Reverb broadcast, then waits for it to arrive back over this browser's socket.
          </p>
        </div>
        <button
          type="button"
          onClick={onSendPing}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
        >
          <SendIcon size={13} />
          Send test ping
        </button>
      </div>

      {!is_connected && (
        <div className="rounded-lg border border-warning-500/30 bg-warning-50 px-3 py-2 text-xs text-warning-600">
          The websocket client isn't connected yet, a ping can still be sent but its pong will not arrive until the connection is up.
        </div>
      )}

      <div className="max-h-64 overflow-y-auto rounded-lg border border-shell-border">
        {pings.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-shell-text-faint">No pings sent yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-shell-panel-alt text-shell-text-faint">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Ping ID</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shell-border">
              {pings.map((entry) => (
                <tr key={entry.ping_id}>
                  <td className="px-3 py-2 font-mono text-shell-text-secondary">{entry.ping_id.slice(0, 8)}</td>
                  <td className={`px-3 py-2 font-medium ${STATUS_META[entry.status].className}`}>
                    <span className="flex items-center gap-1.5">
                      <StatusIcon status={entry.status} />
                      {STATUS_META[entry.status].label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-shell-text">
                    {entry.latency_ms !== null ? `${entry.latency_ms} ms` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PingTesterCard;
