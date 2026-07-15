"use client";
import { useState } from "react";
import type { PermissionMatrix, PermissionsConfig, PermissionRole } from "./types";

export type PermissionsManagerApi = {
  roles: PermissionRole[];
  active_role: PermissionRole;
  selectRole: (role_id: string) => void;
  groups: PermissionsConfig["groups"];
  isChecked: (key: string) => boolean;
  togglePermission: (key: string) => void;
};

/**
 * Owns all Permissions-tab state behind one config-in/API-out hook, the same shape
 * as {@link useProfileManager} and `useBoardToolbar` — the active role and its
 * checkbox matrix live here, every panel below stays presentational over the output.
 * Doesn't have an API yet, so toggling a permission just updates local state.
 */
export function usePermissionsManager(config: PermissionsConfig): PermissionsManagerApi {
  const first_role = config.roles[0];
  const [active_role_id, setActiveRoleId] = useState(first_role?.id ?? "");
  const [checks, setChecks] = useState<PermissionMatrix>(config.defaults);

  const active_role =
    config.roles.find((role) => role.id === active_role_id) ?? first_role ?? { id: "", label: "" };

  const isChecked = (key: string) => !!checks[active_role_id]?.[key];

  const togglePermission = (key: string) => {
    setChecks((current) => ({
      ...current,
      [active_role_id]: {
        ...current[active_role_id],
        [key]: !current[active_role_id]?.[key],
      },
    }));
  };

  return {
    roles: config.roles,
    active_role,
    selectRole: setActiveRoleId,
    groups: config.groups,
    isChecked,
    togglePermission,
  };
}
