"use client";
import React from "react";
import { ToggleSwitch } from "@/components/board";
import { useAuth } from "@/context/AuthContext";
import { useAccountPermissionsManager } from "../useAccountPermissionsManager";
import type { AccountPermissionRole } from "@/types/administration/account-permissions";

const ROLE_COLUMN_LABELS: Record<AccountPermissionRole, { label: string; description: string }> = {
  staff: { label: "Staff", description: "Team members" },
  client: { label: "Client", description: "External and guest accounts" },
};

const GRID = "grid grid-cols-[minmax(240px,1fr)_120px_120px_130px] items-center gap-3";

/**
 * Administration > Security > Permissions, monday's account permissions matrix: what each
 * user role may do across the whole account. Admins always hold every permission; the API
 * enforces the matrix on every guarded endpoint.
 */
const PermissionsSection: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const can_manage = hasAnyRole("super_admin", "admin");
  const manager = useAccountPermissionsManager();
  const permissions = manager.permissions;

  return (
    <div className="max-w-[860px]">
      <p className="mb-5 max-w-[620px] text-[13px] leading-relaxed text-shell-text-muted">
        Choose what each role can do across the account. Changes apply right away. Admins and super admins can always do
        everything.
      </p>

      {manager.error ? (
        <div className="mb-4 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {manager.error}
        </div>
      ) : null}

      {manager.is_loading || !permissions ? (
        manager.is_loading ? <div className="text-[13px] text-shell-text-faint">Loading permissions…</div> : null
      ) : (
        <div className="overflow-x-auto rounded-xl border border-shell-border">
          <div className="min-w-[640px]">
            <div className={`${GRID} border-b border-shell-border bg-shell-panel-alt px-4 py-3`}>
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-shell-text-faint">Permission</span>
              {permissions.roles.map((role) => (
                <span key={role} className="text-center">
                  <span className="block text-[12.5px] font-bold text-shell-text">{ROLE_COLUMN_LABELS[role]?.label ?? role}</span>
                  <span className="block text-[11px] text-shell-text-faint">{ROLE_COLUMN_LABELS[role]?.description}</span>
                </span>
              ))}
              <span className="text-center">
                <span className="block text-[12.5px] font-bold text-shell-text">Admin</span>
                <span className="block text-[11px] text-shell-text-faint">Always allowed</span>
              </span>
            </div>

            {permissions.definitions.map((definition) => (
              <div key={definition.key} className={`${GRID} border-b border-shell-border px-4 py-3.5 last:border-b-0`}>
                <span>
                  <span className="block text-[13.5px] font-semibold text-shell-text">{definition.label}</span>
                  <span className="block text-[12px] text-shell-text-muted">{definition.description}</span>
                </span>
                {permissions.roles.map((role) => {
                  const is_on = permissions.matrix[role]?.[definition.key] ?? true;
                  const is_saving = manager.saving_cell === `${role}.${definition.key}`;
                  return (
                    <span key={role} className={`flex justify-center ${is_saving ? "opacity-60" : ""}`}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={is_on}
                        aria-label={`${definition.label} for ${ROLE_COLUMN_LABELS[role]?.label ?? role}`}
                        disabled={!can_manage || is_saving}
                        onClick={() => void manager.togglePermission(role, definition.key)}
                        className="flex disabled:cursor-default"
                      >
                        <ToggleSwitch is_on={is_on} />
                      </button>
                    </span>
                  );
                })}
                <span className="flex justify-center">
                  <span className="flex opacity-50">
                    <ToggleSwitch is_on />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!can_manage ? (
        <p className="mt-3 text-[12px] text-shell-text-faint">Only account admins can change permissions.</p>
      ) : null}
    </div>
  );
};

export default PermissionsSection;
