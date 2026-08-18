import React from "react";
import { TrashIcon } from "./icons";
import type { DiagnosticLogEntry } from "@/types/websocket-test";

type DiagnosticLogPanelProps = {
  logs: DiagnosticLogEntry[];
  onClear: () => void;
};

const LEVEL_DOT: Record<DiagnosticLogEntry["level"], string> = {
  info: "bg-gray-400",
  success: "bg-success-500",
  warning: "bg-warning-500",
  error: "bg-error-500",
};

const DiagnosticLogPanel: React.FC<DiagnosticLogPanelProps> = ({ logs, onClear }) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-shell-text">Event log</h3>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg border border-shell-border px-2.5 py-1.5 text-xs font-medium text-shell-text-secondary transition hover:bg-shell-hover hover:text-shell-text"
        >
          <TrashIcon size={13} />
          Clear
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg bg-gray-dark px-3 py-2.5 font-mono text-[11px] leading-relaxed text-gray-200">
        {logs.length === 0 ? (
          <div className="py-4 text-center text-gray-500">No events yet.</div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 py-0.5">
              <span className="mt-1 text-gray-500">{new Date(entry.at).toLocaleTimeString()}</span>
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${LEVEL_DOT[entry.level]}`} />
              <span className="flex-1 break-all">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DiagnosticLogPanel;
