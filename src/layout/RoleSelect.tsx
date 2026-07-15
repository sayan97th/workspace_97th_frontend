"use client";
import React, { useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CrownIcon,
  EyeIcon,
  MemberIcon,
  type IconComponent,
} from "@/icons/workspace-icons";
import {
  invite_roles as default_roles,
  type InviteRole,
  type InviteRoleId,
} from "@/data/invite-members-data";

type RoleSelectProps = {
  value: InviteRoleId;
  onChange: (role: InviteRoleId) => void;
  roles?: InviteRole[];
  /** Which edge the menu aligns to. Defaults to the right edge of the trigger. */
  align?: "left" | "right";
  className?: string;
};

/** Glyph shown next to each role, keyed by role id. */
const role_icon: Record<InviteRoleId, IconComponent> = {
  viewer: EyeIcon,
  member: MemberIcon,
  admin: CrownIcon,
};

/**
 * Compact permission-level picker (Viewer / Member / Admin) styled for the dark
 * workspace shell. Reusable anywhere an invite or share flow needs to assign a
 * role: pass the current `value`, an `onChange` handler and optionally a custom
 * `roles` list.
 */
const RoleSelect: React.FC<RoleSelectProps> = ({
  value,
  onChange,
  roles = default_roles,
  align = "right",
  className = "",
}) => {
  const [is_open, setIsOpen] = useState(false);

  const active_role = roles.find((role) => role.id === value) ?? roles[0];
  const ActiveIcon = role_icon[active_role.id];

  const handleSelect = (role_id: InviteRoleId) => {
    onChange(role_id);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        className="flex items-center gap-2 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3 py-[9px] text-[13px] font-medium text-shell-text-secondary transition-colors hover:border-brand-500/60"
      >
        <ActiveIcon size={14} className="text-shell-text-muted" />
        {active_role.label}
        <ChevronDownIcon size={12} className="text-shell-text-muted" />
      </button>

      {is_open && (
        <>
          <div
            className="fixed inset-0 z-[410]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="listbox"
            className={`absolute top-[calc(100%+6px)] z-[411] w-[260px] rounded-xl border border-shell-border-strong bg-shell-panel p-1.5 shadow-[0_22px_52px_rgba(0,0,0,0.55)] ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {roles.map((role) => {
              const RoleIcon = role_icon[role.id];
              const is_selected = role.id === value;
              return (
                <button
                  key={role.id}
                  type="button"
                  role="option"
                  aria-selected={is_selected}
                  onClick={() => handleSelect(role.id)}
                  className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-shell-hover"
                >
                  <span className="mt-0.5 flex-none text-shell-text-muted">
                    <RoleIcon size={15} />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-[13.5px] font-semibold text-shell-text">
                      {role.label}
                      {is_selected && (
                        <CheckIcon size={12} className="text-brand-400" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-[1.45] text-shell-text-muted">
                      {role.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RoleSelect;
