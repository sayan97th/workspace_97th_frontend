"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import type { SlackAdministrationApi } from "@/hooks/useSlackAdministration";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import type { SlackConnectedWorkspaceDto } from "@/types/slack";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_CARD, SECTION_HINT, SECTION_TITLE } from "@/components/administration/slack/slackAdminStyles";

export type SlackWorkspacesCardProps = {
  slack: SlackIntegrationApi;
  admin: SlackAdministrationApi;
};

/** Initials tile shown in place of the workspace icon, Slack does not share the icon without an extra permission. */
const WorkspaceInitials: React.FC<{ name: string; is_active: boolean }> = ({ name, is_active }) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      aria-hidden="true"
      className={`flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-[13px] font-bold ${
        is_active ? "bg-brand-500 text-white" : "border border-shell-border bg-shell-panel text-shell-text-secondary"
      }`}
    >
      {initials || "S"}
    </div>
  );
};

type WorkspaceRowProps = {
  workspace: SlackConnectedWorkspaceDto;
  slack: SlackIntegrationApi;
  admin: SlackAdministrationApi;
};

const WorkspaceRow: React.FC<WorkspaceRowProps> = ({ workspace, slack, admin }) => {
  const [is_confirming, setIsConfirming] = useState(false);
  const is_busy = admin.busy_key === workspace.id;
  const is_last = admin.workspaces.length === 1;
  const domain = workspace.team_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null;

  const confirmDisconnect = async () => {
    if (await admin.disconnectWorkspace(workspace.id)) setIsConfirming(false);
  };

  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <WorkspaceInitials name={workspace.team_name} is_active={workspace.is_active} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[13.5px] font-bold text-shell-text">{workspace.team_name}</span>
            {workspace.is_active ? (
              <span className="rounded-md bg-[#00c875]/[0.14] px-2 py-0.5 text-[11px] font-bold text-[#3ddc97]">Active</span>
            ) : null}
            {workspace.missing_scopes.length > 0 ? (
              <span className="rounded-md bg-[#fdab3d]/[0.14] px-2 py-0.5 text-[11px] font-bold text-[#fdab3d]" title={`Missing ${workspace.missing_scopes.join(", ")}`}>
                Needs reconnect
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-[12px] text-shell-text-muted">
            {domain ? `${domain} · ` : ""}
            {workspace.linked_members_count === 1 ? "1 member connected" : `${workspace.linked_members_count} members connected`}
            {workspace.connected_by ? ` · Added by ${workspace.connected_by}` : ""}
            {workspace.connected_at ? ` on ${format(new Date(workspace.connected_at), "MMM d, yyyy")}` : ""}
          </div>
        </div>

        {!is_confirming ? (
          <div className="flex flex-none flex-wrap gap-2">
            {!workspace.is_active ? (
              <button type="button" onClick={() => void admin.activateWorkspace(workspace.id)} disabled={admin.busy_key !== null} className={PRIMARY_BUTTON}>
                {is_busy ? "Switching…" : "Make active"}
              </button>
            ) : null}
            {workspace.team_url ? (
              <a href={workspace.team_url} target="_blank" rel="noopener noreferrer" className={SECONDARY_BUTTON}>
                Open in Slack
              </a>
            ) : null}
            {workspace.missing_scopes.length > 0 ? (
              <button type="button" onClick={() => void slack.connectWorkspace()} disabled={slack.is_working} className={SECONDARY_BUTTON}>
                Reconnect
              </button>
            ) : null}
            <button type="button" onClick={() => setIsConfirming(true)} disabled={admin.busy_key !== null} className={SECONDARY_BUTTON}>
              Disconnect
            </button>
          </div>
        ) : null}
      </div>

      {workspace.missing_scopes.length > 0 && !is_confirming ? (
        <p className="ml-[52px] mt-2 text-[12px] leading-relaxed text-shell-text-muted">
          This workspace was connected before the app asked for {workspace.missing_scopes.join(", ")}. Use Reconnect and choose {workspace.team_name} on
          the Slack page so members can be matched by email.
        </p>
      ) : null}

      {is_confirming ? (
        <div className="ml-[52px] mt-3 rounded-[9px] border border-[#e2445c]/25 bg-[#e2445c]/[0.06] p-3.5">
          <div className="text-[13px] font-bold text-shell-text">Disconnect {workspace.team_name}?</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
            {is_last
              ? "Every member will stop receiving Slack notifications and automations that post to Slack will be switched off."
              : workspace.is_active
                ? "The most recently added remaining workspace becomes the active one. Member links to this workspace are removed."
                : "Member links to this workspace are removed. The active workspace is not affected."}{" "}
            You can connect it again at any time.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void confirmDisconnect()}
              disabled={is_busy}
              className="rounded-[9px] bg-[#e2445c] px-4 py-[9px] text-[13px] font-bold text-white transition-colors hover:bg-[#c22d45] disabled:cursor-default disabled:opacity-50"
            >
              {is_busy ? "Disconnecting…" : "Disconnect"}
            </button>
            <button type="button" onClick={() => setIsConfirming(false)} className={SECONDARY_BUTTON}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
};

/**
 * Administration > Integrations > Slack workspaces, like monday.com's Connections page: every
 * Slack workspace connected to this account, which one is active, and the actions to switch,
 * reconnect, open or disconnect each one.
 */
const SlackWorkspacesCard: React.FC<SlackWorkspacesCardProps> = ({ slack, admin }) => {
  const can_add = slack.status?.is_configured ?? false;

  return (
    <section className={SECTION_CARD}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={SECTION_TITLE}>Slack workspaces</h3>
          <p className={SECTION_HINT}>
            Notifications and automations use the active workspace. Keep several connected and switch whenever you need, members stay linked in each one.
          </p>
        </div>
        <button type="button" onClick={() => void slack.connectWorkspace()} disabled={!can_add || slack.is_working} className={`${PRIMARY_BUTTON} flex-none`}>
          {slack.is_working ? "Opening Slack…" : admin.workspaces.length === 0 ? "Add to Slack" : "Add workspace"}
        </button>
      </div>

      {slack.awaiting_purpose === "install" ? (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.08] px-3.5 py-2.5 text-[12.5px] text-shell-text-secondary">
          <span>Waiting for Slack. Finish in the new tab, choose the workspace in the top right corner of the Slack page and click Allow.</span>
          <button type="button" onClick={slack.cancelAwaitingSlack} className="flex-none text-[12px] font-semibold opacity-70 hover:opacity-100">
            Cancel
          </button>
        </div>
      ) : can_add ? (
        <p className="mt-2 text-[12px] text-shell-text-faint">
          Slack opens in a new tab. To add a different workspace, pick it in the top right corner of the Slack page before clicking Allow.
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-shell-text-faint">
          {slack.status?.can_configure_app
            ? "Set up the Slack app in Developer settings below, then connect a workspace."
            : "The account owner needs to set up the Slack app once before a workspace can be connected."}
        </p>
      )}

      <div className="mt-4 border-t border-shell-border pt-4">
        {admin.is_loading ? (
          <div className="text-[12.5px] text-shell-text-faint">Loading workspaces…</div>
        ) : admin.workspaces.length === 0 ? (
          <div className="text-[12.5px] text-shell-text-muted">No Slack workspace is connected yet.</div>
        ) : (
          <ul className="divide-y divide-shell-border">
            {admin.workspaces.map((workspace) => (
              <WorkspaceRow key={workspace.id} workspace={workspace} slack={slack} admin={admin} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SlackWorkspacesCard;
