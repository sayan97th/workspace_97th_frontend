"use client";
import React from "react";
import type { SlackConnectionDto, SlackUserLinkDto } from "@/types/slack";

export type SlackAccountRowsProps = {
  /** Slack accounts the member connected themselves, the newest first. */
  connections: SlackConnectionDto[];
  /** The account their direct messages go to, see `SlackUserLinkDto`. */
  link: SlackUserLinkDto | null;
  /** Name of the account's active workspace, used for a link made before team names were reported. */
  active_team_name: string | null;
  is_working: boolean;
  onDisconnectConnection: (connection_id: number) => void;
  onDisconnectLink: () => void;
};

const formatConnectedAt = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const automationsLabel = (count: number): string => (count === 1 ? "Used by 1 automation" : `Used by ${count} automations`);

/**
 * The rows of My Profile > Integrations > Your Slack accounts: every Slack account the member
 * connected, the one that gets their direct messages tagged. A link made without a connection of
 * its own (matched by email or "Connect my Slack" in the active workspace) gets its own row, so it
 * can be disconnected from here too.
 */
const SlackAccountRows: React.FC<SlackAccountRowsProps> = ({
  connections,
  link,
  active_team_name,
  is_working,
  onDisconnectConnection,
  onDisconnectLink,
}) => {
  const link_team_id = link?.team_id ?? null;
  const has_link_row = link !== null && !connections.some((connection) => connection.team_id === link_team_id);

  return (
    <>
      {has_link_row && link ? (
        <div className="profile-row">
          <div className="profile-row-text">
            <div className="profile-row-label flex flex-wrap items-center gap-2">
              {link.team_name ?? active_team_name ?? "Slack"}
              <span className="profile-pill profile-pill-success">Gets your notifications</span>
            </div>
            <div className="profile-row-description">Signed in as {link.slack_display_name ?? "your Slack account"}.</div>
          </div>
          <div className="profile-row-control">
            <button type="button" onClick={onDisconnectLink} disabled={is_working} className="profile-button profile-button-secondary disabled:cursor-default disabled:opacity-50">
              Disconnect
            </button>
          </div>
        </div>
      ) : null}

      {connections.map((connection) => {
        const gets_notifications = link_team_id !== null && connection.team_id === link_team_id;
        const connected_at = formatConnectedAt(connection.connected_at);
        const details = [
          `Signed in as ${connection.slack_user_name ?? "your Slack account"}`,
          connected_at ? `connected ${connected_at}` : null,
          connection.automations_count > 0 ? automationsLabel(connection.automations_count) : null,
        ].filter(Boolean);

        return (
          <div key={connection.id} className="profile-row">
            <div className="profile-row-text">
              <div className="profile-row-label flex flex-wrap items-center gap-2">
                {connection.team_name}
                {gets_notifications ? <span className="profile-pill profile-pill-success">Gets your notifications</span> : null}
                {connection.is_active_workspace ? <span className="profile-pill">Account workspace</span> : null}
              </div>
              <div className="profile-row-description">{details.join(", ")}.</div>
            </div>
            <div className="profile-row-control">
              <button
                type="button"
                onClick={() => onDisconnectConnection(connection.id)}
                disabled={is_working}
                className="profile-button profile-button-secondary disabled:cursor-default disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default SlackAccountRows;
