"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, LayoutGrid, Link2, Lock, Mail, Share2, Users, X } from "lucide-react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-error";
import { boardInvitationService } from "@/services/board-invitation.service";
import { peopleService } from "@/services/people.service";
import type { BoardAccessEntry, BoardWorkspaceAccess } from "@/types/board-invitation";
import type { BoardType, WorkspaceMember } from "@/types/workspace";
import AccessRoster from "./AccessRoster";
import EmailInvitePanel, { type EmailInviteSubmission } from "./EmailInvitePanel";
import MemberPickerPanel, { type InviteTeam } from "./MemberPickerPanel";
import { boardAccessCopy, boardUrl, mergeAccessRows, peopleLabel } from "./boardInviteUtils";
import "@/components/invitations/invitations.scss";
import "./board-invite.scss";

/** How long a freshly added roster row keeps its highlight. */
const FRESH_ROW_MS = 2200;

type InviteTab = "members" | "email";

export type BoardInviteModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  board_label: string;
  board_type: BoardType;
  workspace_name: string;
  /** Whether the viewer may add or remove people (the board's creator, a workspace owner or an admin). */
  can_manage: boolean;
  /** The workspace roster, the "Workspace members" tab picks from it. Deactivated accounts are skipped. */
  members: WorkspaceMember[];
  /** Preloaded roster so the dialog opens instantly instead of showing a spinner first. */
  initial_access: BoardAccessEntry[];
  /** Called whenever the roster changes (people added, invite sent or revoked, access removed) so the header's "Invite / {count}" badge stays in sync. */
  onAccessChange: (access: BoardAccessEntry[]) => void;
};

const BANNER_ICONS: Record<BoardType, React.ReactNode> = {
  main: <Building2 size={16} />,
  private: <Lock size={16} />,
  shareable: <Share2 size={16} />,
};

/**
 * "Invite to this board" dialog opened from the board header's "Invite / {count}" button.
 *
 * Two ways in, on a segmented control: "Workspace members" picks people (or whole teams) who
 * are already in the workspace and gives them access right away, "Invite by email" reaches
 * anyone, including people without an account, who get an email, sign up or sign in, and land on
 * this board as a guest. Below, "People with access" lists everyone who can open the board,
 * grouped by how they got in, with resend, revoke and remove inline.
 */
const BoardInviteModal: React.FC<BoardInviteModalProps> = ({
  is_open,
  onClose,
  board_id,
  board_label,
  board_type,
  workspace_name,
  can_manage,
  members,
  initial_access,
  onAccessChange,
}) => {
  const toast = useToast();
  const { user } = useAuth();
  const title_id = useId();
  const fresh_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tab, setTab] = useState<InviteTab>("members");
  const [access, setAccess] = useState<BoardAccessEntry[]>(initial_access);
  const [workspace_access, setWorkspaceAccess] = useState<BoardWorkspaceAccess | null>(null);
  const [teams, setTeams] = useState<InviteTeam[]>([]);
  const [is_busy, setIsBusy] = useState(false);
  const [busy_key, setBusyKey] = useState<string | null>(null);
  const [fresh_keys, setFreshKeys] = useState<Set<string>>(() => new Set());
  const [is_link_copied, setIsLinkCopied] = useState(false);

  const current_user_id = user?.id ?? null;
  const active_members = useMemo(() => members.filter((member) => !member.is_deactivated), [members]);

  /** Updates the local roster and tells the board header. */
  const commitAccess = useCallback(
    (next_access: BoardAccessEntry[]) => {
      setAccess(next_access);
      onAccessChange(next_access);
    },
    [onAccessChange]
  );

  /** Re-reads the roster quietly, so workspace access stays right after people are added or removed. */
  const refreshRoster = useCallback(async () => {
    try {
      const roster = await boardInvitationService.listRoster(board_id);
      commitAccess(roster.data);
      setWorkspaceAccess(roster.workspace_access ?? { applies: false, total: 0, members: [] });
    } catch {
      setWorkspaceAccess((current) => current ?? { applies: false, total: 0, members: [] });
    }
  }, [board_id, commitAccess]);

  // Fresh state every time the dialog opens, then the full roster and the board's teams.
  useEffect(() => {
    if (!is_open) return;
    setAccess(initial_access);
    setWorkspaceAccess(null);
    setFreshKeys(new Set());
    setIsLinkCopied(false);
    setTab("members");
    void refreshRoster();
    let cancelled = false;
    peopleService
      .listBoardTeams(board_id)
      .then((data) => {
        if (!cancelled) setTeams(data.map((team) => ({ id: Number(team.id), name: team.name, member_ids: team.member_ids.map(Number) })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, board_id]);

  // Escape closes the dialog (inner lists stop the event first) and the page stops scrolling behind it.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  useEffect(
    () => () => {
      if (fresh_timer_ref.current) clearTimeout(fresh_timer_ref.current);
    },
    []
  );

  const added_user_ids = useMemo(
    () => new Set(access.filter((entry) => entry.kind !== "invitation").map((entry) => entry.id)),
    [access]
  );
  const added_emails = useMemo(
    () => new Set(access.filter((entry) => entry.kind !== "invitation").map((entry) => entry.email.toLowerCase())),
    [access]
  );
  const pending_emails = useMemo(
    () => new Set(access.filter((entry) => entry.kind === "invitation").map((entry) => entry.email.toLowerCase())),
    [access]
  );

  if (!is_open || typeof document === "undefined") return null;

  const markFresh = (rows: BoardAccessEntry[]) => {
    if (rows.length === 0) return;
    setFreshKeys(new Set(rows.map((row) => row.key)));
    if (fresh_timer_ref.current) clearTimeout(fresh_timer_ref.current);
    fresh_timer_ref.current = setTimeout(() => setFreshKeys(new Set()), FRESH_ROW_MS);
  };

  /** Adds workspace members and invites emails in one go, returns the new rows. */
  const grantAccess = async (member_ids: number[], emails: string[], message: string) => {
    let rows: BoardAccessEntry[] = [];
    let skipped: string[] = [];
    if (member_ids.length > 0) {
      const result = await boardInvitationService.addCollaborators(board_id, member_ids);
      rows = rows.concat(result.data);
    }
    if (emails.length > 0) {
      const result = await boardInvitationService.inviteViewers(board_id, emails, message);
      rows = rows.concat(result.data);
      skipped = result.skipped.map((entry) => entry.email);
    }
    commitAccess(mergeAccessRows(access, rows));
    markFresh(rows);
    return { rows, skipped };
  };

  const handleAddMembers = async (user_ids: number[]): Promise<boolean> => {
    setIsBusy(true);
    try {
      const { rows } = await grantAccess(user_ids, [], "");
      if (rows.length > 0) toast.success(`${peopleLabel(rows.length)} added to ${board_label}`);
      else toast.info("Everyone you picked already has access");
      void refreshRoster();
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't add those people. Please try again."));
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendEmails = async ({ member_ids, emails, message }: EmailInviteSubmission): Promise<boolean> => {
    setIsBusy(true);
    try {
      const { rows, skipped } = await grantAccess(member_ids, emails, message);
      const invited = rows.filter((row) => row.kind === "invitation").length;
      const added = rows.length - invited;
      const parts = [
        added > 0 ? `${peopleLabel(added)} added` : null,
        invited > 0 ? `${invited === 1 ? "1 invitation" : `${invited} invitations`} sent` : null,
      ].filter(Boolean);
      if (parts.length > 0) toast.success(parts.join(", "));
      if (skipped.length > 0) toast.info(`Already had access: ${skipped.join(", ")}`);
      if (parts.length === 0 && skipped.length === 0) toast.info("Everyone you entered already has access");
      void refreshRoster();
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't send those invitations. Please try again."));
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async (entry: BoardAccessEntry) => {
    setBusyKey(entry.key);
    try {
      if (entry.kind === "invitation") await boardInvitationService.revokeInvitation(board_id, entry.id);
      else await boardInvitationService.removeCollaborator(board_id, entry.id);
      commitAccess(access.filter((row) => row.key !== entry.key));
      toast.success(entry.kind === "invitation" ? `Invitation to ${entry.email} revoked` : `${entry.full_name ?? entry.email} was removed`);
      // A removed workspace member can still open a main or shareable board, the refresh moves them there.
      void refreshRoster();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't remove that access. Please try again."));
    } finally {
      setBusyKey(null);
    }
  };

  const handleResend = async (entry: BoardAccessEntry) => {
    setBusyKey(entry.key);
    try {
      const result = await boardInvitationService.inviteViewers(board_id, [entry.email]);
      commitAccess(mergeAccessRows(access, result.data));
      markFresh(result.data);
      toast.success(`Invitation resent to ${entry.email}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't resend that invitation. Please try again."));
    } finally {
      setBusyKey(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(boardUrl(board_id));
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), 2000);
    } catch {
      toast.error("We couldn't copy the link.");
    }
  };

  const banner = boardAccessCopy(board_type, workspace_name);
  const available_count = active_members.filter((member) => member.id !== current_user_id && !added_user_ids.has(member.id)).length;
  const tab_index = tab === "members" ? 0 : 1;

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: InviteTab = tab === "members" ? "email" : "members";
    setTab(next);
    document.getElementById(`binv-tab-${next}`)?.focus();
  };

  return createPortal(
    <div className="invitations-theme binv-root">
      <div className="binv-backdrop" onClick={onClose} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-labelledby={title_id} className="binv-dialog">
        <header className="binv-header">
          <span className="binv-header-icon" aria-hidden="true">
            <Users size={20} />
          </span>
          <div className="binv-header-text">
            <h2 id={title_id} className="binv-title">
              Invite to this board
            </h2>
            <div className="binv-header-meta">
              <span className="binv-board-chip" title={board_label}>
                <LayoutGrid size={13} />
                <span>{board_label}</span>
              </span>
              <span>in {workspace_name}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="binv-close">
            <X size={18} />
          </button>
        </header>

        <div className="binv-body">
          <div className="binv-banner" data-tone={banner.tone}>
            <span className="binv-banner-icon">{BANNER_ICONS[board_type]}</span>
            <span>
              <span className="binv-banner-title">{banner.title}</span>
              <span className="binv-banner-text">{banner.text}</span>
            </span>
          </div>

          {can_manage ? (
            <div className="binv-composer">
              <div className="binv-tabs" role="tablist" aria-label="How to invite" onKeyDown={handleTabKeyDown}>
                <span className="binv-tabs-thumb" data-index={tab_index} aria-hidden="true" />
                <button
                  id="binv-tab-members"
                  type="button"
                  role="tab"
                  className="binv-tab"
                  aria-selected={tab === "members"}
                  aria-controls="binv-panel-members"
                  tabIndex={tab === "members" ? 0 : -1}
                  onClick={() => setTab("members")}
                >
                  <Users size={16} />
                  <span className="binv-tab-long">Workspace members</span>
                  <span className="binv-tab-short">Members</span>
                  {available_count > 0 && <span className="binv-tab-count">{available_count}</span>}
                </button>
                <button
                  id="binv-tab-email"
                  type="button"
                  role="tab"
                  className="binv-tab"
                  aria-selected={tab === "email"}
                  aria-controls="binv-panel-email"
                  tabIndex={tab === "email" ? 0 : -1}
                  onClick={() => setTab("email")}
                >
                  <Mail size={16} />
                  <span className="binv-tab-long">Invite by email</span>
                  <span className="binv-tab-short">By email</span>
                </button>
              </div>

              {tab === "members" ? (
                <MemberPickerPanel
                  members={active_members}
                  teams={teams}
                  added_user_ids={added_user_ids}
                  current_user_id={current_user_id}
                  workspace_can_view={board_type !== "private"}
                  is_busy={is_busy}
                  onAdd={handleAddMembers}
                />
              ) : (
                <EmailInvitePanel
                  members={active_members}
                  added_emails={added_emails}
                  pending_emails={pending_emails}
                  is_busy={is_busy}
                  onSend={handleSendEmails}
                />
              )}
            </div>
          ) : (
            <div className="binv-locked">
              <Lock size={16} />
              <span>Only the board&apos;s creator, a workspace owner or an admin can invite people to this board.</span>
            </div>
          )}

          <AccessRoster
            entries={access}
            workspace_access={workspace_access}
            workspace_name={workspace_name}
            current_user_id={current_user_id}
            can_manage={can_manage}
            busy_key={busy_key}
            fresh_keys={fresh_keys}
            onRemove={handleRemove}
            onResend={handleResend}
          />
        </div>

        <footer className="binv-footer">
          <button
            type="button"
            className="inv-button inv-button-ghost binv-copy-link"
            data-copied={is_link_copied ? "true" : "false"}
            onClick={() => void copyLink()}
          >
            {is_link_copied ? <Check size={15} /> : <Link2 size={15} />}
            {is_link_copied ? "Link copied" : "Copy board link"}
          </button>
          <button type="button" className="inv-button inv-button-primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default BoardInviteModal;
