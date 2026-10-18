"use client";

import React, { useEffect, useRef, useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { workspaceInviteLinkService } from "@/services/workspace-invite-link.service";
import type { ApiError } from "@/types/auth";
import type { WorkspaceInviteLink, WorkspaceMembershipRole } from "@/types/invitation";
import { CheckIcon, ChevronDownIcon, InfoIcon, LinkIcon, LockIcon, RefreshIcon } from "@/icons/workspace-icons";
import { WORKSPACE_ROLE_META } from "../InvitationRoleBadge";

/** How long the "Copied" state stays on the copy button. */
const COPIED_RESET_MS = 2000;

const LINK_ROLES: ReadonlyArray<WorkspaceMembershipRole> = ["viewer", "member", "owner"];

/** Fetched on open, only a workspace owner or admin may view or manage the link. */
type InviteLinkState =
  | { status: "loading" }
  | { status: "loaded"; link: WorkspaceInviteLink }
  | { status: "forbidden" }
  | { status: "error"; message: string };

const apiErrorMessage = (error: unknown, fallback: string): string => {
  const api_error = error as ApiError;
  const field_message = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return field_message || api_error?.message || fallback;
};

export type InviteLinkPanelProps = {
  workspace_slug?: string;
};

/**
 * "Invite with link" card of the Invite members dialog: on/off switch, the role people join
 * with, the link itself with Copy, and Reset behind an inline confirm because the old link stops
 * working right away. Members without access see a short notice instead.
 */
const InviteLinkPanel: React.FC<InviteLinkPanelProps> = ({ workspace_slug }) => {
  const [state, setState] = useState<InviteLinkState>({ status: "loading" });
  const [is_copied, setIsCopied] = useState(false);
  const [is_saving, setIsSaving] = useState(false);
  const [is_confirming_reset, setIsConfirmingReset] = useState(false);
  const [action_error, setActionError] = useState<string | null>(null);
  const copied_timer_ref = useRef<number | null>(null);

  useEffect(() => {
    if (!workspace_slug) return;
    let is_cancelled = false;
    setState({ status: "loading" });
    workspaceInviteLinkService
      .getInviteLink(workspace_slug)
      .then((link) => {
        if (!is_cancelled) setState({ status: "loaded", link });
      })
      .catch((error: unknown) => {
        if (is_cancelled) return;
        setState(
          (error as ApiError)?.status_code === 403
            ? { status: "forbidden" }
            : { status: "error", message: apiErrorMessage(error, "We couldn't load the invite link.") }
        );
      });
    return () => {
      is_cancelled = true;
    };
  }, [workspace_slug]);

  useEffect(() => {
    return () => {
      if (copied_timer_ref.current) window.clearTimeout(copied_timer_ref.current);
    };
  }, []);

  if (!workspace_slug) return null;

  if (state.status === "forbidden") {
    return (
      <section className="inv-link-card" aria-labelledby="invite_link_title">
        <div className="inv-link-head">
          <span className="inv-link-icon" data-tone="neutral">
            <LockIcon size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="invite_link_title" className="inv-link-title">
              Invite with link
            </h3>
            <p className="inv-link-detail">Only workspace owners and admins can share the invite link.</p>
          </div>
        </div>
      </section>
    );
  }

  const link = state.status === "loaded" ? state.link : null;
  const is_enabled = link?.enabled ?? false;

  const updateLink = async (payload: { enabled?: boolean; role?: WorkspaceMembershipRole }) => {
    if (!link || is_saving) return;
    setIsSaving(true);
    setActionError(null);
    // Optimistic, the switch and role react right away and roll back on failure.
    setState({ status: "loaded", link: { ...link, ...payload } });
    try {
      const updated_link = await workspaceInviteLinkService.updateInviteLink(workspace_slug, payload);
      setState({ status: "loaded", link: updated_link });
    } catch (error) {
      setState({ status: "loaded", link });
      setActionError(apiErrorMessage(error, "We couldn't update the invite link."));
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setIsCopied(true);
      if (copied_timer_ref.current) window.clearTimeout(copied_timer_ref.current);
      copied_timer_ref.current = window.setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
    } catch {
      setActionError("Your browser blocked the clipboard. Select the link and copy it instead.");
    }
  };

  const resetLink = async () => {
    if (is_saving) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const new_link = await workspaceInviteLinkService.regenerateInviteLink(workspace_slug);
      setState({ status: "loaded", link: new_link });
      setIsConfirmingReset(false);
    } catch (error) {
      setActionError(apiErrorMessage(error, "We couldn't reset the link. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const role_meta = link ? WORKSPACE_ROLE_META[link.role] : null;

  return (
    <section className="inv-link-card" aria-labelledby="invite_link_title" data-enabled={is_enabled ? "true" : "false"}>
      <div className="inv-link-head">
        <span className="inv-link-icon" data-tone={is_enabled ? "brand" : "neutral"}>
          <LinkIcon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="invite_link_title" className="inv-link-title">
            Invite with link
          </h3>
          <p className="inv-link-detail">
            {state.status === "loading"
              ? "Loading the workspace link..."
              : state.status === "error"
                ? state.message
                : is_enabled
                  ? "Anyone with the link can join this workspace."
                  : "Turn it on to let anyone with the link join."}
          </p>
        </div>
        <PortalTooltip content={is_enabled ? "Turn off link invites" : "Turn on link invites"}>
          <button
            type="button"
            role="switch"
            aria-checked={is_enabled}
            aria-label="Link invites"
            disabled={!link || is_saving}
            onClick={() => void updateLink({ enabled: !is_enabled })}
            className="inv-switch"
          >
            <span className="inv-switch-thumb" aria-hidden />
          </button>
        </PortalTooltip>
      </div>

      {link && is_enabled ? (
        <div className="inv-link-body">
          <div className="inv-link-row">
            <label className="inv-link-field">
              <span className="sr-only">Invite link</span>
              <input
                readOnly
                value={link.url}
                onFocus={(event) => event.currentTarget.select()}
                className="inv-link-input"
              />
            </label>
            <PortalTooltip content={is_copied ? "Copied" : "Copy link"}>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inv-button inv-button-secondary inv-link-copy"
                data-copied={is_copied ? "true" : "false"}
              >
                {is_copied ? <CheckIcon size={13} /> : <LinkIcon size={14} />}
                {is_copied ? "Copied" : "Copy link"}
              </button>
            </PortalTooltip>
          </div>

          <div className="inv-link-meta">
            <span className="inv-link-role">
              <span>People join as</span>
              <span className="inv-field">
                <select
                  aria-label="Role for people who join with the link"
                  value={link.role}
                  disabled={is_saving}
                  onChange={(event) => void updateLink({ role: event.target.value as WorkspaceMembershipRole })}
                  className="inv-select inv-link-role-select"
                >
                  {LINK_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {WORKSPACE_ROLE_META[role].label}
                    </option>
                  ))}
                </select>
                <span className="inv-field-trailing">
                  <ChevronDownIcon size={11} />
                </span>
              </span>
              {role_meta ? (
                <PortalTooltip content={role_meta.hint}>
                  <span className="inv-link-info" tabIndex={0} aria-label={role_meta.hint}>
                    <InfoIcon size={13} />
                  </span>
                </PortalTooltip>
              ) : null}
            </span>

            {is_confirming_reset ? (
              <span className="inv-link-confirm" role="group" aria-label="Reset the invite link">
                <span>The current link stops working.</span>
                <button type="button" className="inv-text-button" onClick={() => setIsConfirmingReset(false)} disabled={is_saving}>
                  Cancel
                </button>
                <button type="button" className="inv-text-button" data-tone="danger" onClick={() => void resetLink()} disabled={is_saving}>
                  {is_saving ? "Resetting..." : "Reset link"}
                </button>
              </span>
            ) : (
              <PortalTooltip content="Create a new link. The current one stops working.">
                <button type="button" className="inv-text-button" onClick={() => setIsConfirmingReset(true)} disabled={is_saving}>
                  <RefreshIcon size={13} />
                  Reset link
                </button>
              </PortalTooltip>
            )}
          </div>
        </div>
      ) : null}

      {action_error ? (
        <p role="alert" className="inv-link-error">
          {action_error}
        </p>
      ) : null}
    </section>
  );
};

export default InviteLinkPanel;
