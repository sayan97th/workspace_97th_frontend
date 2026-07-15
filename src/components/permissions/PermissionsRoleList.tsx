"use client";
import React from "react";
import type { PermissionRole } from "./types";

export type PermissionsRoleListProps = {
  roles: PermissionRole[];
  active_role_id: string;
  onSelectRole: (role_id: string) => void;
  title?: string;
};

/** Active-row tint mixed against the theme's panel color, so it reads correctly in light and dark mode. */
const ACTIVE_ROLE_BG = "color-mix(in srgb, var(--color-shell-panel-alt) 80%, #0073ea 20%)";

/** Left column of {@link PermissionsPanel}: the selectable list of default workspace roles. */
const PermissionsRoleList: React.FC<PermissionsRoleListProps> = ({
  roles,
  active_role_id,
  onSelectRole,
  title = "Default workspace roles",
}) => (
  <div className="w-[250px] flex-none pr-6">
    <div className="mb-3.5 text-[15px] font-bold text-shell-text">{title}</div>
    {roles.map((role) => {
      const is_active = role.id === active_role_id;
      return (
        <div
          key={role.id}
          onClick={() => onSelectRole(role.id)}
          style={is_active ? { background: ACTIVE_ROLE_BG } : undefined}
          className={`mb-1 cursor-pointer rounded-lg px-[13px] py-[11px] text-[14.5px] transition-colors ${
            is_active ? "font-bold text-shell-text" : "font-medium text-shell-text hover:bg-shell-hover"
          }`}
        >
          {role.label}
        </div>
      );
    })}
  </div>
);

export default PermissionsRoleList;
