"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { accountPermissionsService } from "@/services/administration/account-permissions.service";
import type {
  AccountPermissionKey,
  AccountPermissionRole,
  AccountPermissionsDto,
} from "@/types/administration/account-permissions";

export type AccountPermissionsManagerApi = {
  is_loading: boolean;
  error: string | null;
  permissions: AccountPermissionsDto | null;
  saving_cell: string | null;
  togglePermission: (role: AccountPermissionRole, key: AccountPermissionKey) => Promise<void>;
};

/** Owns Administration > Security > Permissions: saves each toggle as soon as it flips. */
export function useAccountPermissionsManager(): AccountPermissionsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<AccountPermissionsDto | null>(null);
  const [saving_cell, setSavingCell] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    accountPermissionsService
      .getPermissions()
      .then((result) => {
        if (!cancelled) setPermissions(result);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load account permissions."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePermission = useCallback(
    async (role: AccountPermissionRole, key: AccountPermissionKey) => {
      if (!permissions) return;
      const next_value = !permissions.matrix[role][key];
      const previous = permissions;
      setPermissions({ ...permissions, matrix: { ...permissions.matrix, [role]: { ...permissions.matrix[role], [key]: next_value } } });
      setSavingCell(`${role}.${key}`);
      setError(null);
      try {
        setPermissions(await accountPermissionsService.updatePermissions({ permissions: { [role]: { [key]: next_value } } }));
      } catch (err) {
        setPermissions(previous);
        setError(apiErrorMessage(err, "We couldn't save that permission."));
      } finally {
        setSavingCell(null);
      }
    },
    [permissions]
  );

  return { is_loading, error, permissions, saving_cell, togglePermission };
}
