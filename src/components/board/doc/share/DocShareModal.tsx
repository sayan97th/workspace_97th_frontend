"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, ChevronDown, Crown, Link2, Lock, Mail, Share2, Users, X } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { getApiErrorMessage } from "@/lib/api-error";
import { boardInvitationService } from "@/services/board-invitation.service";
import { boardOptionsService } from "@/services/board-options.service";
import { peopleService } from "@/services/people.service";
import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardEditPermission, BoardType, WorkspaceMember } from "@/types/workspace";
import "../doc-page.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RESULTS = 8;

type ShareTeam = { id: number; name: string; member_ids: number[] };

type SearchResult =
  | { kind: "member"; key: string; member: WorkspaceMember }
  | { kind: "team"; key: string; team: ShareTeam; new_member_ids: number[] }
  | { kind: "email"; key: string; email: string };

/** The two choices of monday's "Choose who can edit this doc", stored as the board's `edit_permission`. */
type DocEditMode = "everyone" | "owners";

const editModeFor = (edit_permission: BoardEditPermission): DocEditMode => (edit_permission === "view_only" ? "owners" : "everyone");

export type DocShareModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  board_type: BoardType;
  workspace_name: string;
  /** The account name, shown in "Everyone with access at {name}". */
  company_name: string;
  /** Whether the viewer is one of the doc's owners, who manage access, edit rights and the public link. */
  can_manage: boolean;
  members: WorkspaceMember[];
  access: BoardAccessEntry[];
  onAccessChange: (access: BoardAccessEntry[]) => void;
  edit_permission: BoardEditPermission;
  onEditPermissionChange: (edit_permission: BoardEditPermission) => void;
  /** The read only public link: whether it is on and the url it opens at. */
  public_link: DocSharePublicLink;
  /** Turns the public link on or off. Rejects when the change fails, the dialog reports it. */
  onTogglePublicLink: (is_enabled: boolean) => Promise<void>;
};

export type DocSharePublicLink = {
  is_enabled: boolean;
  url: string | null;
};

const findabilityNotice = (board_type: BoardType, workspace_name: string): { icon: React.ReactNode; text: string } => {
  if (board_type === "private") return { icon: <Lock size={18} />, text: "Only invited people and admins can find this doc" };
  if (board_type === "shareable") return { icon: <Share2 size={18} />, text: `Everyone at ${workspace_name} and invited guests can find this doc` };
  return { icon: <Building2 size={18} />, text: `Everyone at ${workspace_name} can find this doc` };
};

/**
 * monday.com style "Invite to this doc" dialog, opened from the doc's Share
 * button. The search adds workspace members (or a whole team) right away and
 * invites anyone else by email. Below it, who can find the doc and everyone
 * with access (owners carry a crown). The footer holds who may edit the doc
 * (the board's `edit_permission`) and the read only public link.
 */
const DocShareModal: React.FC<DocShareModalProps> = ({
  is_open,
  onClose,
  board_id,
  board_type,
  workspace_name,
  company_name,
  can_manage,
  members,
  access,
  onAccessChange,
  edit_permission,
  onEditPermissionChange,
  public_link,
  onTogglePublicLink,
}) => {
  const toast = useToast();
  const title_id = useId();
  const listbox_id = useId();
  const input_ref = useRef<HTMLInputElement>(null);
  const edit_menu_ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [is_results_open, setIsResultsOpen] = useState(false);
  const [active_index, setActiveIndex] = useState(0);
  const [teams, setTeams] = useState<ShareTeam[]>([]);
  const [is_adding, setIsAdding] = useState(false);
  const [removing_key, setRemovingKey] = useState<string | null>(null);
  const [is_edit_menu_open, setIsEditMenuOpen] = useState(false);
  const [is_saving_permission, setIsSavingPermission] = useState(false);
  const [is_saving_link, setIsSavingLink] = useState(false);

  useEffect(() => {
    if (!is_open) return;
    setQuery("");
    setIsResultsOpen(false);
    setIsEditMenuOpen(false);
    requestAnimationFrame(() => input_ref.current?.focus());
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
  }, [is_open, board_id]);

  // Escape closes the innermost layer first: the search results, the edit menu, then the dialog.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (is_results_open || is_edit_menu_open) {
        setIsResultsOpen(false);
        setIsEditMenuOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_results_open, is_edit_menu_open, onClose]);

  useEffect(() => {
    if (!is_edit_menu_open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!edit_menu_ref.current?.contains(event.target as Node)) setIsEditMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [is_edit_menu_open]);

  const access_user_ids = useMemo(
    () => new Set(access.filter((entry) => entry.kind !== "invitation").map((entry) => entry.id)),
    [access]
  );
  const access_emails = useMemo(() => new Set(access.map((entry) => entry.email.toLowerCase())), [access]);
  const member_by_id = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const results = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const found: SearchResult[] = [];
    members
      .filter((member) => !member.is_deactivated && !access_user_ids.has(member.id))
      .filter((member) => member.full_name.toLowerCase().includes(needle) || member.email.toLowerCase().includes(needle))
      .slice(0, MAX_RESULTS)
      .forEach((member) => found.push({ kind: "member", key: `member-${member.id}`, member }));
    teams
      .filter((team) => team.name.toLowerCase().includes(needle))
      .forEach((team) => {
        const new_member_ids = team.member_ids.filter((id) => member_by_id.has(id) && !access_user_ids.has(id));
        found.push({ kind: "team", key: `team-${team.id}`, team, new_member_ids });
      });
    const is_known_email = members.some((member) => member.email.toLowerCase() === needle);
    if (EMAIL_PATTERN.test(needle) && !is_known_email && !access_emails.has(needle)) {
      found.push({ kind: "email", key: `email-${needle}`, email: query.trim() });
    }
    return found;
  }, [query, members, teams, access_user_ids, access_emails, member_by_id]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!is_open || typeof document === "undefined") return null;

  const mergeAccess = (rows: BoardAccessEntry[]) => {
    const keys = new Set(rows.map((row) => row.key));
    onAccessChange([...access.filter((row) => !keys.has(row.key)), ...rows]);
  };

  const pickResult = async (result: SearchResult) => {
    if (is_adding) return;
    if (result.kind === "team" && result.new_member_ids.length === 0) {
      toast.info(`Everyone in ${result.team.name} already has access`);
      return;
    }
    setIsAdding(true);
    try {
      if (result.kind === "email") {
        const response = await boardInvitationService.inviteViewers(board_id, [result.email]);
        mergeAccess(response.data);
        toast.success(response.data.length > 0 ? `Invitation sent to ${result.email}` : `${result.email} already has access`);
      } else {
        const user_ids = result.kind === "member" ? [result.member.id] : result.new_member_ids;
        const response = await boardInvitationService.addCollaborators(board_id, user_ids);
        mergeAccess(response.data);
      }
      setQuery("");
      setIsResultsOpen(false);
      input_ref.current?.focus();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't share this doc. Please try again."));
    } finally {
      setIsAdding(false);
    }
  };

  const removeEntry = async (entry: BoardAccessEntry) => {
    setRemovingKey(entry.key);
    try {
      if (entry.kind === "invitation") await boardInvitationService.revokeInvitation(board_id, entry.id);
      else await boardInvitationService.removeCollaborator(board_id, entry.id);
      onAccessChange(access.filter((row) => row.key !== entry.key));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't remove that access. Please try again."));
    } finally {
      setRemovingKey(null);
    }
  };

  const changeEditMode = async (mode: DocEditMode) => {
    setIsEditMenuOpen(false);
    if (mode === editModeFor(edit_permission)) return;
    const next_permission: BoardEditPermission = mode === "owners" ? "view_only" : "everything";
    const previous = edit_permission;
    onEditPermissionChange(next_permission);
    setIsSavingPermission(true);
    try {
      await boardOptionsService.updateBoardPermission(board_id, next_permission);
    } catch (error) {
      onEditPermissionChange(previous);
      toast.error(getApiErrorMessage(error, "We couldn't change who can edit this doc."));
    } finally {
      setIsSavingPermission(false);
    }
  };

  const togglePublicLink = async () => {
    setIsSavingLink(true);
    try {
      await onTogglePublicLink(!public_link.is_enabled);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't update the public link."));
    } finally {
      setIsSavingLink(false);
    }
  };

  const copyPublicLink = async () => {
    if (!public_link.url) return;
    try {
      await navigator.clipboard.writeText(public_link.url);
      toast.success("Public link copied");
    } catch {
      toast.error("We couldn't copy the link.");
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!is_results_open || results.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + step + results.length) % results.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void pickResult(results[active_index] ?? results[0]);
    }
  };

  const notice = findabilityNotice(board_type, workspace_name);
  const edit_mode = editModeFor(edit_permission);
  const edit_options: { value: DocEditMode; label: string; hint: string }[] = [
    { value: "everyone", label: `Everyone with access at ${company_name}`, hint: "Anyone who can open this doc can edit it" },
    { value: "owners", label: "Only doc owners", hint: "Everyone else can view and comment" },
  ];
  const current_edit_option = edit_options.find((option) => option.value === edit_mode) ?? edit_options[0];
  const show_results = is_results_open && query.trim().length > 0;

  return createPortal(
    <div className="doc-theme doc-share-overlay">
      <div className="doc-share-backdrop" onClick={onClose} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-labelledby={title_id} className="doc-share-dialog">
        <div className="doc-share-header">
          <h2 id={title_id} className="doc-share-title">
            Invite to this doc
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="doc-share-close">
            <X size={20} />
          </button>
        </div>

        <div className="doc-share-search">
          <input
            ref={input_ref}
            type="text"
            value={query}
            disabled={!can_manage || is_adding}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsResultsOpen(true);
            }}
            onFocus={() => setIsResultsOpen(true)}
            onBlur={() => window.setTimeout(() => setIsResultsOpen(false), 120)}
            onKeyDown={handleSearchKeyDown}
            placeholder={can_manage ? "Search by name, team, or email address" : "Only the doc's owners can invite people"}
            aria-label="Search by name, team, or email address"
            role="combobox"
            aria-expanded={show_results}
            aria-controls={listbox_id}
            aria-autocomplete="list"
            className="doc-share-input"
          />

          {show_results && (
            <ul id={listbox_id} role="listbox" className="doc-share-results">
              {results.length === 0 ? (
                <li className="doc-share-results-empty">No matches. Type a full email address to invite someone new.</li>
              ) : (
                results.map((result, index) => (
                  <li
                    key={result.key}
                    role="option"
                    aria-selected={index === active_index}
                    className={`doc-share-result${index === active_index ? " is-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void pickResult(result)}
                  >
                    {result.kind === "member" && (
                      <>
                        <UserAvatar user={result.member} size={28} />
                        <span className="doc-share-result-text">
                          <span className="doc-share-result-name">{result.member.full_name}</span>
                          <span className="doc-share-result-meta">{result.member.job_title || result.member.email}</span>
                        </span>
                      </>
                    )}
                    {result.kind === "team" && (
                      <>
                        <span className="doc-share-result-icon">
                          <Users size={16} />
                        </span>
                        <span className="doc-share-result-text">
                          <span className="doc-share-result-name">{result.team.name}</span>
                          <span className="doc-share-result-meta">
                            {result.new_member_ids.length === 0
                              ? "Everyone already has access"
                              : `Team, adds ${result.new_member_ids.length} ${result.new_member_ids.length === 1 ? "person" : "people"}`}
                          </span>
                        </span>
                      </>
                    )}
                    {result.kind === "email" && (
                      <>
                        <span className="doc-share-result-icon">
                          <Mail size={16} />
                        </span>
                        <span className="doc-share-result-text">
                          <span className="doc-share-result-name">Invite {result.email}</span>
                          <span className="doc-share-result-meta">They will get an email to view this doc</span>
                        </span>
                      </>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="doc-share-body">
          <div className="doc-share-notice">
            {notice.icon}
            <span>{notice.text}</span>
          </div>

          <ul className="doc-share-roster" aria-label="People with access">
            {access.map((entry) => {
              const member = entry.kind === "invitation" ? undefined : member_by_id.get(entry.id);
              const subtitle =
                entry.kind === "invitation"
                  ? `${entry.email}, invitation pending`
                  : entry.job_title || member?.job_title || entry.email;
              return (
                <li key={entry.key} className="doc-share-person">
                  {entry.kind === "invitation" ? (
                    <span className="doc-share-pending-avatar">
                      <Mail size={16} />
                    </span>
                  ) : (
                    <UserAvatar user={{ full_name: entry.full_name ?? entry.email, profile_photo_url: entry.profile_photo_url }} size={32} />
                  )}
                  <span className="doc-share-person-text">
                    <span className="doc-share-person-name">{entry.full_name ?? entry.email}</span>
                    <span className="doc-share-person-meta">{subtitle}</span>
                  </span>
                  {entry.kind === "owner" && (
                    <span className="doc-share-owner" title="Doc owner" aria-label="Doc owner">
                      <Crown size={18} fill="currentColor" strokeWidth={1.5} />
                    </span>
                  )}
                  {entry.kind === "invitation" && <span className="doc-share-pending">Pending</span>}
                  <button
                    type="button"
                    className="doc-share-remove"
                    onClick={() => void removeEntry(entry)}
                    disabled={!can_manage || !entry.removable || removing_key === entry.key}
                    aria-label={`Remove ${entry.full_name ?? entry.email}`}
                    title={!entry.removable ? "Owners can't be removed" : can_manage ? "Remove" : "Only the doc's owners can remove people"}
                  >
                    <X size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="doc-share-footer">
          <div className="doc-share-setting">
            <span className="doc-share-setting-label">Choose who can edit this doc</span>
            <div ref={edit_menu_ref} className="doc-share-select-wrap">
              <button
                type="button"
                className="doc-share-select"
                disabled={!can_manage || is_saving_permission}
                aria-haspopup="listbox"
                aria-expanded={is_edit_menu_open}
                title={can_manage ? undefined : "Only the doc's owners can change this"}
                onClick={() => setIsEditMenuOpen((current) => !current)}
              >
                <span className="truncate">{current_edit_option.label}</span>
                <ChevronDown size={16} />
              </button>
              {is_edit_menu_open && (
                <ul role="listbox" aria-label="Who can edit this doc" className="doc-share-select-menu">
                  {edit_options.map((option) => (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={option.value === edit_mode}
                      className={`doc-share-select-option${option.value === edit_mode ? " is-selected" : ""}`}
                      onClick={() => void changeEditMode(option.value)}
                    >
                      <span className="doc-share-select-option-text">
                        <span>{option.label}</span>
                        <span className="doc-share-select-option-hint">{option.hint}</span>
                      </span>
                      {option.value === edit_mode && <Check size={16} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="doc-share-divider" />

          <div className="doc-share-setting">
            <span className="doc-share-setting-text">
              <span className="doc-share-setting-label">Share public link</span>
              <span className="doc-share-setting-hint">Create a public link for view-only access.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={public_link.is_enabled}
              aria-label="Share public link"
              className="doc-share-switch"
              disabled={!can_manage || is_saving_link}
              title={can_manage ? undefined : "Only the doc's owners can share a public link"}
              onClick={() => void togglePublicLink()}
            >
              <span className="doc-share-switch-thumb" />
            </button>
          </div>

          {public_link.is_enabled && public_link.url && (
            <div className="doc-share-link-row">
              <input readOnly value={public_link.url} aria-label="Public link" className="doc-share-link-input" onFocus={(event) => event.target.select()} />
              <button type="button" className="doc-share-copy" onClick={() => void copyPublicLink()}>
                <Link2 size={16} />
                Copy link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DocShareModal;
