import React from "react";
import { AppWindow, Building2, UserRound } from "lucide-react";
import type { SlackStatusDto } from "@/types/slack";

type TileProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  is_ready: boolean;
};

const Tile: React.FC<TileProps> = ({ icon, label, value, detail, is_ready }) => (
  <div className="flex min-w-0 items-start gap-3 rounded-lg border border-[var(--admin-list-border)] bg-shell-panel px-4 py-3.5">
    <span
      className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${
        is_ready ? "bg-[var(--admin-success-bg)] text-[var(--admin-success-text)]" : "bg-[var(--admin-neutral-bg)] text-shell-text-secondary"
      }`}
    >
      {icon}
    </span>
    <div className="min-w-0">
      <div className="text-[13px] text-shell-text-secondary">{label}</div>
      <div className="truncate text-[15px] font-semibold leading-6 text-shell-text" title={value}>
        {value}
      </div>
      <div className="truncate text-[13px] text-shell-text-faint" title={detail}>
        {detail}
      </div>
    </div>
  </div>
);

const SOURCE_LABELS: Record<SlackStatusDto["credentials_source"], string> = {
  environment: "From the API .env file",
  database: "Saved in Slack settings",
  none: "Add an app in Slack settings",
};

/** At a glance: the Slack app in use, the active workspace and the caller's own notification link. */
const SlackOverviewTiles: React.FC<{ status: SlackStatusDto | null; is_loading: boolean }> = ({ status, is_loading }) => {
  if (is_loading && !status) return null;

  const workspace = status?.workspace ?? null;
  const user_link = status?.current_user_link ?? null;
  const other_workspaces = Math.max((status?.workspaces_count ?? 0) - 1, 0);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Tile
        icon={<AppWindow size={18} strokeWidth={1.75} aria-hidden="true" />}
        label="Slack app in use"
        value={status?.is_configured ? (status.app_name ?? "Slack app") : "No app set up"}
        detail={SOURCE_LABELS[status?.credentials_source ?? "none"]}
        is_ready={status?.is_configured ?? false}
      />
      <Tile
        icon={<Building2 size={18} strokeWidth={1.75} aria-hidden="true" />}
        label="Active workspace"
        value={workspace?.team_name ?? "Not connected"}
        detail={workspace ? (other_workspaces > 0 ? `${other_workspaces} more connected` : "The only connected workspace") : "Add one in Slack settings"}
        is_ready={workspace !== null}
      />
      <Tile
        icon={<UserRound size={18} strokeWidth={1.75} aria-hidden="true" />}
        label="Your Slack account"
        value={user_link ? (user_link.slack_display_name ?? user_link.slack_user_id) : "Not linked"}
        detail={user_link ? "Receives your notifications" : "Use Connect my Slack below"}
        is_ready={user_link !== null}
      />
    </div>
  );
};

export default SlackOverviewTiles;
