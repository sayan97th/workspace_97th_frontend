"use client";
import { useEffect, useState } from "react";
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
 * `config.defaults` can come straight from an API response; pass `on_toggle` to
 * persist a flip back to the server (the local matrix updates optimistically either way).
 */
export function usePermissionsManager(
  config: PermissionsConfig,
  on_toggle?: (role_id: string, key: string, allowed: boolean) => void
): PermissionsManagerApi {
  const first_role = config.roles[0];
  const [active_role_id, setActiveRoleId] = useState(first_role?.id ?? "");
  const [checks, setChecks] = useState<PermissionMatrix>(config.defaults);

  // `config.roles`/`config.defaults` can arrive after an async fetch (e.g.
  // Manage Workspace's Permissions tab loads its matrix from the API) — the
  // very first render has no roles yet, so `active_role_id` starts empty and
  // must resync once the real roles land, or every lookup below keys off an
  // id nothing in `checks` ever matches.
  useEffect(() => {
    setChecks(config.defaults);
  }, [config.defaults]);

  useEffect(() => {
    setActiveRoleId((current) =>
      config.roles.some((role) => role.id === current) ? current : (first_role?.id ?? "")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.roles]);

  const active_role =
    config.roles.find((role) => role.id === active_role_id) ?? first_role ?? { id: "", label: "" };

  const isChecked = (key: string) => !!checks[active_role.id]?.[key];

  const togglePermission = (key: string) => {
    const next_allowed = !checks[active_role.id]?.[key];

    setChecks((current) => ({
      ...current,
      [active_role.id]: {
        ...current[active_role.id],
        [key]: next_allowed,
      },
    }));

    on_toggle?.(active_role.id, key, next_allowed);
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
