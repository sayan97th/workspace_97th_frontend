import React from "react";
import { RadarIcon } from "./icons";
import type { WebsocketStatusDto } from "@/types/websocket-test";

type ClientConfigCardProps = {
  status: WebsocketStatusDto | null;
};

const CLIENT_CONFIG = {
  app_key: process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? "",
  host: process.env.NEXT_PUBLIC_REVERB_HOST ?? "",
  port: process.env.NEXT_PUBLIC_REVERB_PORT ?? "",
  scheme: process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "",
};

function ConfigRow({ label, client_value, server_value }: { label: string; client_value: string; server_value: string | number | undefined }) {
  const server_display = server_value === undefined || server_value === "" ? "—" : String(server_value);
  const matches = server_value !== undefined && String(server_value) === client_value;

  return (
    <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 py-1.5 text-xs">
      <span className="text-shell-text-secondary">{label}</span>
      <span className="truncate text-right font-mono text-shell-text">{client_value || "—"}</span>
      <span className={`truncate text-right font-mono ${matches ? "text-success-600" : "text-error-600"}`}>
        {server_display}
      </span>
    </div>
  );
}

const ClientConfigCard: React.FC<ClientConfigCardProps> = ({ status }) => {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div className="flex items-center gap-2 text-shell-text-secondary">
        <RadarIcon size={15} />
        <span className="text-xs font-medium uppercase tracking-wide">Client vs. server config</span>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 border-b border-shell-border pb-1.5 text-[11px] font-medium text-shell-text-faint">
        <span />
        <span className="text-right">Browser env</span>
        <span className="text-right">Server</span>
      </div>

      <div className="divide-y divide-shell-border">
        <ConfigRow label="App key" client_value={CLIENT_CONFIG.app_key} server_value={status?.reverb.app_key} />
        <ConfigRow label="Host" client_value={CLIENT_CONFIG.host} server_value={status?.reverb.host} />
        <ConfigRow label="Port" client_value={CLIENT_CONFIG.port} server_value={status?.reverb.port} />
        <ConfigRow label="Scheme" client_value={CLIENT_CONFIG.scheme} server_value={status?.reverb.scheme} />
      </div>

      {status && (
        <p className="text-[11px] text-shell-text-faint">
          Mismatched rows above are highlighted in red, they usually mean the frontend's NEXT_PUBLIC_REVERB_* env vars are out of sync with the API's.
        </p>
      )}
    </div>
  );
};

export default ClientConfigCard;
