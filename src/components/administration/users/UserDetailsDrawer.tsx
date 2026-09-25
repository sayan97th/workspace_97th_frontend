"use client";
import React, { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { PersonAvatar } from "@/components/board";
import SlideOverPanel from "@/components/board/drawer/SlideOverPanel";
import { CloseIcon } from "@/icons/workspace-icons";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminSessionsService } from "@/services/administration/admin-sessions.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import type { AdminUserDetailsDto, AdminUserDto } from "@/types/administration/admin-users";
import type { ProfileFieldDto } from "@/types/administration/profile-fields";
import { toPersonOption } from "../adminUserMapping";
import { primaryRole, ROLE_LABELS } from "../useUsersManager";

export type UserDetailsDrawerProps = {
  user_id: number | null;
  profile_fields: ProfileFieldDto[];
  can_manage: boolean;
  onClose: () => void;
  /** Pushes an updated user back into the table row. */
  onUserUpdated: (user: AdminUserDto) => void;
  /** Opens the table's deactivate/reactivate confirmation for this user. */
  onRequestToggleActive: (user: AdminUserDto) => void;
};

const sectionTitleClass = "mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-shell-text-faint";
const inputClass =
  "h-[34px] w-full rounded-lg border border-shell-border-strong bg-shell-panel-alt px-2.5 text-[12.5px] text-shell-text outline-none focus:border-brand-500";
const actionButtonClass =
  "rounded-lg border border-shell-border-strong bg-shell-panel-alt px-3 py-[7px] text-[12px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50";

const statusOf = (user: AdminUserDto): { label: string; className: string } => {
  if (user.deleted_at) return { label: "Deleted", className: "bg-[#e2445c]/[0.14] text-[#ff8a94]" };
  if (!user.is_active) return { label: "Deactivated", className: "bg-[#fdab3d]/[0.14] text-[#ffc46b]" };
  return { label: "Active", className: "bg-[#00c875]/[0.14] text-[#3ddc97]" };
};

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 py-[7px] text-[12.5px]">
    <span className="text-shell-text-muted">{label}</span>
    <span className="min-w-0 truncate text-right font-medium text-shell-text-secondary">{children}</span>
  </div>
);

const ProfileFieldInput: React.FC<{
  field: ProfileFieldDto;
  value: string;
  is_disabled: boolean;
  onChange: (value: string) => void;
}> = ({ field, value, is_disabled, onChange }) => {
  if (field.type === "dropdown") {
    return (
      <select value={value} disabled={is_disabled} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">Not set</option>
        {field.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      disabled={is_disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Not set"
      className={inputClass}
    />
  );
};

/**
 * Side panel opened from a Users row, like monday's member profile card for admins: the
 * person's account details, custom profile fields (editable by admins), teams, workspaces,
 * owned boards, active sessions and recent audit events, plus quick actions.
 */
const UserDetailsDrawer: React.FC<UserDetailsDrawerProps> = ({
  user_id,
  profile_fields,
  can_manage,
  onClose,
  onUserUpdated,
  onRequestToggleActive,
}) => {
  const [details, setDetails] = useState<AdminUserDetailsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [field_draft, setFieldDraft] = useState<Record<string, string>>({});
  const [is_saving_fields, setIsSavingFields] = useState(false);
  const [busy_action, setBusyAction] = useState<"reset" | "logout" | null>(null);
  const [reload_token, setReloadToken] = useState(0);

  useEffect(() => {
    if (user_id === null) return;
    let cancelled = false;
    setError(null);
    adminUsersService
      .getUserDetails(user_id)
      .then((result) => {
        if (cancelled) return;
        setDetails(result);
        setFieldDraft(
          Object.fromEntries(Object.entries(result.user.profile_fields ?? {}).map(([id, value]) => [id, value ?? ""]))
        );
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load this user."));
      });
    return () => {
      cancelled = true;
    };
  }, [user_id, reload_token]);

  // Start clean each time a different person is opened.
  useEffect(() => {
    setDetails(null);
    setNotice(null);
  }, [user_id]);

  const user = details?.user ?? null;
  const saved_fields = user?.profile_fields ?? {};
  const changed_field_ids = useMemo(
    () => profile_fields.map((field) => String(field.id)).filter((id) => (field_draft[id] ?? "") !== (saved_fields[id] ?? "")),
    [profile_fields, field_draft, saved_fields]
  );

  const saveFields = async () => {
    if (!user || changed_field_ids.length === 0) return;
    setIsSavingFields(true);
    setError(null);
    try {
      const values = Object.fromEntries(changed_field_ids.map((id) => [id, field_draft[id]?.trim() ? field_draft[id].trim() : null]));
      const updated = await adminUsersService.updateProfileFieldValues(user.id, values);
      setDetails((current) => (current ? { ...current, user: { ...current.user, ...updated } } : current));
      onUserUpdated(updated);
      setNotice("Profile fields saved.");
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't save the profile fields."));
    } finally {
      setIsSavingFields(false);
    }
  };

  const sendResetLink = async () => {
    if (!user) return;
    setBusyAction("reset");
    setError(null);
    try {
      const response = await adminUsersService.sendPasswordResetLink(user.id);
      setNotice(response.message || "Password reset link sent.");
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't send a password reset link."));
    } finally {
      setBusyAction(null);
    }
  };

  const logoutEverywhere = async () => {
    if (!user) return;
    setBusyAction("logout");
    setError(null);
    try {
      const count = await adminSessionsService.revokeUserSessions(user.id);
      setNotice(count === 1 ? "1 session logged out." : `${count} sessions logged out.`);
      setReloadToken((token) => token + 1);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't log this user out."));
    } finally {
      setBusyAction(null);
    }
  };

  const status = user ? statusOf(user) : null;

  return (
    <SlideOverPanel
      is_open={user_id !== null}
      onClose={onClose}
      panel_class_name="w-[480px] max-w-[94vw] border-l border-shell-border-strong bg-shell-panel text-shell-text shadow-[-24px_0_60px_rgba(0,0,0,0.5)]"
    >
      <div className="flex flex-none items-center justify-between gap-3 border-b border-shell-border px-[22px] pb-4 pt-5">
        <h2 className="m-0 text-[18px] font-extrabold tracking-[-0.01em]">User details</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close user details"
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="shell-scrollbar min-h-0 flex-1 overflow-auto px-[22px] py-5">
        {error ? (
          <div className="mb-4 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-4 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-2.5 text-[12.5px] font-medium text-[#8fe3b8]">
            {notice}
          </div>
        ) : null}

        {!user || !details ? (
          error ? null : <p className="py-10 text-center text-[13px] text-shell-text-faint">Loading…</p>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3.5">
              <PersonAvatar person={toPersonOption(user)} size={56} />
              <div className="min-w-0">
                <div className="truncate text-[17px] font-bold text-shell-text">{user.full_name}</div>
                <div className="truncate text-[12.5px] text-shell-text-muted">{user.email}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="rounded-md bg-shell-hover-strong px-2 py-0.5 text-[11.5px] font-bold text-shell-text-secondary">
                    {ROLE_LABELS[primaryRole(user)]}
                  </span>
                  {status ? (
                    <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-bold ${status.className}`}>{status.label}</span>
                  ) : null}
                </div>
              </div>
            </div>

            {can_manage && !user.deleted_at ? (
              <div className="mb-6 flex flex-wrap gap-2">
                <button type="button" disabled={busy_action !== null} onClick={() => void sendResetLink()} className={actionButtonClass}>
                  {busy_action === "reset" ? "Sending…" : "Send password reset"}
                </button>
                <button type="button" disabled={busy_action !== null} onClick={() => void logoutEverywhere()} className={actionButtonClass}>
                  {busy_action === "logout" ? "Logging out…" : "Log out everywhere"}
                </button>
                <button
                  type="button"
                  onClick={() => onRequestToggleActive(user)}
                  className={`${actionButtonClass} ${user.is_active ? "text-[#ff8a94]" : ""}`}
                >
                  {user.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            ) : null}

            <div className="mb-6 grid grid-cols-3 gap-2.5">
              {[
                { label: "Boards owned", value: details.stats.boards_owned },
                { label: "Items created", value: details.stats.items_created },
                { label: "Updates posted", value: details.stats.updates_posted },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-shell-border bg-shell-panel-alt px-3 py-2.5">
                  <div className="text-[18px] font-extrabold text-shell-text">{stat.value.toLocaleString()}</div>
                  <div className="text-[11.5px] text-shell-text-muted">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <div className={sectionTitleClass}>Account</div>
              <div className="divide-y divide-shell-border rounded-xl border border-shell-border px-3.5">
                <InfoRow label="Department">{user.department?.name ?? "None"}</InfoRow>
                <InfoRow label="Job title">{user.job_title || "None"}</InfoRow>
                <InfoRow label="Phone">{user.phone || "None"}</InfoRow>
                <InfoRow label="Email verified">{user.email_verified_at ? "Yes" : "No"}</InfoRow>
                <InfoRow label="Date added">{format(new Date(user.created_at), "MMM d, yyyy")}</InfoRow>
                <InfoRow label="Last active">
                  {user.last_active_at ? formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true }) : "Never"}
                </InfoRow>
              </div>
            </div>

            {profile_fields.length > 0 ? (
              <div className="mb-6">
                <div className={sectionTitleClass}>Profile fields</div>
                <div className="flex flex-col gap-2.5 rounded-xl border border-shell-border p-3.5">
                  {profile_fields.map((field) => (
                    <label key={field.id} className="grid grid-cols-[130px_1fr] items-center gap-3 text-[12.5px] text-shell-text-muted">
                      <span className="truncate">{field.name}</span>
                      <ProfileFieldInput
                        field={field}
                        value={field_draft[String(field.id)] ?? ""}
                        is_disabled={!can_manage}
                        onChange={(value) => setFieldDraft((current) => ({ ...current, [String(field.id)]: value }))}
                      />
                    </label>
                  ))}
                  {can_manage ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={changed_field_ids.length === 0 || is_saving_fields}
                        onClick={() => void saveFields()}
                        className="rounded-lg bg-brand-500 px-3.5 py-[7px] text-[12.5px] font-bold text-white hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
                      >
                        {is_saving_fields ? "Saving…" : "Save fields"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <div className={sectionTitleClass}>Teams ({details.teams.length})</div>
                {details.teams.length === 0 ? (
                  <p className="text-[12.5px] text-shell-text-faint">Not in any team.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {details.teams.map((team) => (
                      <li key={team.id} className="truncate text-[12.5px] text-shell-text-secondary">
                        {team.name}
                        {team.is_team_owner ? <span className="ml-1.5 text-[11px] text-shell-text-faint">Owner</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className={sectionTitleClass}>Workspaces ({details.workspaces.length})</div>
                {details.workspaces.length === 0 ? (
                  <p className="text-[12.5px] text-shell-text-faint">Not in any workspace.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {details.workspaces.map((workspace) => (
                      <li key={workspace.id} className="truncate text-[12.5px] text-shell-text-secondary">
                        {workspace.name}
                        {workspace.role ? <span className="ml-1.5 text-[11px] capitalize text-shell-text-faint">{workspace.role}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mb-6">
              <div className={sectionTitleClass}>Boards owned ({details.owned_boards.total})</div>
              {details.owned_boards.data.length === 0 ? (
                <p className="text-[12.5px] text-shell-text-faint">Doesn&apos;t own any board.</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {details.owned_boards.data.map((board) => (
                    <li key={board.id}>
                      <a
                        href={`/boards/${board.id}`}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-shell-hover"
                      >
                        <span className="truncate font-medium text-shell-text-secondary">{board.label}</span>
                        <span className="flex-none text-[11.5px] text-shell-text-faint">
                          {board.is_archived ? "Archived" : board.workspace?.name}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-6">
              <div className={sectionTitleClass}>Active sessions ({details.sessions.length})</div>
              {details.sessions.length === 0 ? (
                <p className="text-[12.5px] text-shell-text-faint">No active sessions.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {details.sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                      <span className="truncate text-shell-text-secondary">{session.device}</span>
                      <span className="flex-none text-[11.5px] text-shell-text-faint">
                        {formatDistanceToNow(new Date(session.last_used_at), { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className={sectionTitleClass}>Recent activity</div>
              {details.recent_activity.length === 0 ? (
                <p className="text-[12.5px] text-shell-text-faint">No recorded activity.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {details.recent_activity.map((entry) => (
                    <li key={entry.id} className="text-[12.5px] leading-snug">
                      <div className="text-shell-text-secondary">
                        <span className="font-semibold text-shell-text">{entry.actor?.full_name ?? "System"}</span>{" "}
                        {entry.description.charAt(0).toLowerCase() + entry.description.slice(1)}
                      </div>
                      <div className="text-[11px] text-shell-text-faint">{format(new Date(entry.created_at), "MMM d, yyyy p")}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </SlideOverPanel>
  );
};

export default UserDetailsDrawer;
