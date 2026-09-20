"use client";
import React, { useEffect } from "react";
import UserAvatar from "@/components/common/UserAvatar";
import { CheckIcon, CloseIcon, SearchIcon } from "@/icons/workspace-icons";
import type { DepartmentMembersApi } from "./useDepartmentMembers";

export type DepartmentMembersModalProps = {
  members: DepartmentMembersApi;
  onClose: () => void;
};

const searchInputClass =
  "w-full rounded-[9px] border border-shell-border-strong bg-shell-panel-alt py-[9px] pl-[34px] pr-3 text-[13.5px] text-shell-text placeholder:text-shell-text-faint outline-none focus:border-brand-500";

const SectionTitle: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div className="mb-2.5">
    <div className="text-[13px] font-bold text-shell-text">{children}</div>
    {hint ? <div className="mt-0.5 text-[12px] text-shell-text-muted">{hint}</div> : null}
  </div>
);

const SearchBox: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string }> = ({
  value,
  onChange,
  placeholder,
}) => (
  <div className="relative mb-2">
    <SearchIcon
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-shell-text-faint"
      size={14}
    />
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={searchInputClass}
    />
  </div>
);

/**
 * "Manage department" dialog opened from {@link DepartmentsSection}. Admins see the owners
 * editor and can pull users in from any department; a department owner sees the same dialog
 * scoped to their own department, where only unassigned users can be added.
 */
const DepartmentMembersModal: React.FC<DepartmentMembersModalProps> = ({ members, onClose }) => {
  const department = members.department;

  useEffect(() => {
    if (!department) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [department, onClose]);

  if (!department) return null;

  const owner_ids = new Set(department.owners.map((owner) => owner.id));
  const owner_options = members.owner_candidates.filter((candidate) => !owner_ids.has(candidate.id));
  const selected_count = members.selected_member_ids.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Manage ${department.name}`}
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] flex max-h-[90vh] w-[560px] max-w-full flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between border-b border-shell-border px-[22px] py-5">
          <div className="min-w-0">
            <div className="truncate text-[18px] font-extrabold tracking-[-0.01em]">{department.name}</div>
            <div className="mt-1 text-[12.5px] text-shell-text-muted">
              {department.assigned} assigned
              {department.reserved !== null ? `, ${department.reserved} reserved` : ", unlimited seats"}
              {department.over_by > 0 ? (
                <span className="font-semibold text-[#e2445c]">{`, over by ${department.over_by}`}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="shell-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-[22px] py-5">
          {members.error ? (
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/[0.1] px-3 py-2.5 text-[13px] font-medium text-brand-200">
              {members.error}
            </div>
          ) : null}

          <section>
            <SectionTitle hint="Owners can manage the members of this department without being account admins.">
              Owners
            </SectionTitle>

            {department.owners.length === 0 ? (
              <div className="text-[13px] text-shell-text-faint">No owners yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {department.owners.map((owner) => (
                  <span
                    key={owner.id}
                    className="flex items-center gap-2 rounded-full border border-shell-border-strong bg-shell-panel-alt py-1 pl-1 pr-2.5 text-[12.5px] font-semibold"
                  >
                    <UserAvatar user={owner} size={22} />
                    {owner.full_name}
                    {department.can_administer ? (
                      <button
                        type="button"
                        onClick={() => void members.removeOwner(owner.id)}
                        disabled={members.is_saving}
                        aria-label={`Remove ${owner.full_name} as owner`}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-shell-text-muted hover:bg-shell-hover hover:text-[#e2445c] disabled:opacity-50"
                      >
                        <CloseIcon size={10} />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            )}

            {department.can_administer ? (
              <div className="mt-3">
                <SearchBox
                  value={members.owner_query}
                  onChange={members.setOwnerQuery}
                  placeholder="Search staff members to add as owner"
                />
                <div className="shell-scrollbar max-h-[150px] overflow-y-auto rounded-[9px] border border-shell-border">
                  {members.is_loading_owner_candidates && owner_options.length === 0 ? (
                    <div className="px-3 py-3 text-[12.5px] text-shell-text-faint">Searching…</div>
                  ) : owner_options.length === 0 ? (
                    <div className="px-3 py-3 text-[12.5px] text-shell-text-faint">No staff members found.</div>
                  ) : (
                    owner_options.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => void members.addOwner(candidate)}
                        disabled={members.is_saving}
                        className="flex w-full items-center gap-2.5 border-b border-shell-border px-3 py-2 text-left last:border-b-0 hover:bg-shell-hover disabled:opacity-50"
                      >
                        <UserAvatar user={candidate} size={24} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{candidate.full_name}</span>
                          <span className="block truncate text-[11.5px] text-shell-text-muted">{candidate.email}</span>
                        </span>
                        <span className="text-[12px] font-semibold text-brand-200">Make owner</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </section>

          <section>
            <SectionTitle>{`Members (${department.assigned})`}</SectionTitle>
            <div className="shell-scrollbar max-h-[190px] overflow-y-auto rounded-[9px] border border-shell-border">
              {members.is_loading_members && members.member_rows.length === 0 ? (
                <div className="px-3 py-3 text-[12.5px] text-shell-text-faint">Loading members…</div>
              ) : members.member_rows.length === 0 ? (
                <div className="px-3 py-3 text-[12.5px] text-shell-text-faint">
                  Nobody is assigned to this department.
                </div>
              ) : (
                members.member_rows.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2.5 border-b border-shell-border px-3 py-2 last:border-b-0"
                  >
                    <UserAvatar user={member} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{member.full_name}</span>
                      <span className="block truncate text-[11.5px] text-shell-text-muted">{member.email}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void members.removeMember(member)}
                      disabled={members.is_saving}
                      className="rounded-md px-2 py-1 text-[12px] font-semibold text-shell-text-muted hover:bg-[#e2445c]/10 hover:text-[#e2445c] disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <SectionTitle
              hint={
                department.can_administer
                  ? "Adding a user who already has a department moves them here, since each user belongs to one department."
                  : "You can add users who are not assigned to any department yet."
              }
            >
              Add members
            </SectionTitle>
            <SearchBox
              value={members.member_query}
              onChange={members.setMemberQuery}
              placeholder="Search by name or email"
            />
            <div className="shell-scrollbar max-h-[190px] overflow-y-auto rounded-[9px] border border-shell-border">
              {members.is_loading_member_candidates && members.member_candidates.length === 0 ? (
                <div className="px-3 py-3 text-[12.5px] text-shell-text-faint">Searching…</div>
              ) : members.member_candidates.length === 0 ? (
                <div className="px-3 py-3 text-[12.5px] text-shell-text-faint">No users available to add.</div>
              ) : (
                members.member_candidates.map((candidate) => {
                  const is_selected = members.selected_member_ids.includes(candidate.id);
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => members.toggleMemberCandidate(candidate.id)}
                      aria-pressed={is_selected}
                      className="flex w-full items-center gap-2.5 border-b border-shell-border px-3 py-2 text-left last:border-b-0 hover:bg-shell-hover"
                    >
                      <span
                        className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border ${
                          is_selected
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-shell-border-strong text-transparent"
                        }`}
                      >
                        <CheckIcon size={11} />
                      </span>
                      <UserAvatar user={candidate} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{candidate.full_name}</span>
                        <span className="block truncate text-[11.5px] text-shell-text-muted">{candidate.email}</span>
                      </span>
                      <span className="flex-none text-[11.5px] text-shell-text-faint">
                        {candidate.department?.name ?? "No department"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-none items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-[10px] text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => void members.addSelectedMembers()}
            disabled={selected_count === 0 || members.is_saving}
            className="rounded-lg bg-brand-500 px-5 py-[10px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {members.is_saving ? "Saving…" : selected_count > 0 ? `Add ${selected_count} selected` : "Add selected"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentMembersModal;
