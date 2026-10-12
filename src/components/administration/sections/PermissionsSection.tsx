"use client";
import React, { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAccountPermissionsManager } from "../useAccountPermissionsManager";
import type {
  AccountPermissionDefinitionDto,
  AccountPermissionRole,
} from "@/types/administration/account-permissions";

/** Admin is listed first like monday's default roles, but it is locked: admins always hold every permission. */
type PermissionRoleId = AccountPermissionRole | "admin";

const ROLE_DETAILS: Record<PermissionRoleId, { label: string; caption: string }> = {
  admin: { label: "Admin", caption: "Always allowed" },
  staff: { label: "Staff", caption: "Team members" },
  client: { label: "Client", caption: "External and guests" },
};

type PermissionCheckboxProps = {
  definition: AccountPermissionDefinitionDto;
  is_checked: boolean;
  is_disabled: boolean;
  is_saving: boolean;
  onToggle: () => void;
};

const PermissionCheckbox: React.FC<PermissionCheckboxProps> = ({ definition, is_checked, is_disabled, is_saving, onToggle }) => (
  <label className={`admin-checkbox-row ${is_saving ? "opacity-60" : ""}`} data-disabled={is_disabled || undefined}>
    <input type="checkbox" checked={is_checked} disabled={is_disabled || is_saving} onChange={onToggle} />
    <span className="admin-checkbox" aria-hidden="true">
      {is_checked ? <Check size={12} strokeWidth={3} /> : null}
    </span>
    <span className="admin-checkbox-label">
      {definition.label}
      <span className="admin-checkbox-description block">{definition.description}</span>
    </span>
  </label>
);

/**
 * Administration > Permissions, styled after monday.com: the account roles on the left and,
 * for the selected role, what it may do across the whole account as checkbox lists grouped by
 * area ("Account", "Boards"). Each checkbox saves as soon as it flips and the API enforces the
 * matrix on every guarded endpoint. Admins always hold every permission, so their list is
 * shown checked and locked.
 */
const PermissionsSection: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const can_manage = hasAnyRole("super_admin", "admin");
  const manager = useAccountPermissionsManager();
  const permissions = manager.permissions;
  const [selected_role, setSelectedRole] = useState<PermissionRoleId>("staff");

  const grouped_definitions = useMemo(() => {
    if (!permissions) return [];
    const groups = permissions.groups?.length ? permissions.groups : [{ key: "", label: "Account" }];
    return groups
      .map((group) => ({
        ...group,
        definitions: permissions.definitions.filter((definition) => !group.key || definition.group === group.key),
      }))
      .filter((group) => group.definitions.length > 0);
  }, [permissions]);

  if (manager.is_loading) {
    return <div className="text-[14px] text-shell-text-faint">Loading permissions…</div>;
  }

  if (!permissions) {
    return manager.error ? (
      <div role="alert" className="admin-notice admin-notice-error">
        {manager.error}
      </div>
    ) : null;
  }

  const role_ids: PermissionRoleId[] = ["admin", ...permissions.roles];
  const is_admin_selected = selected_role === "admin";

  return (
    <div className="admin-permissions">
      <div className="admin-permissions-roles">
        <h3 className="admin-group-title" id="admin-roles-title">
          Default account roles
        </h3>
        <div role="listbox" aria-labelledby="admin-roles-title" className="flex flex-col gap-0.5">
          {role_ids.map((role) => (
            <button
              key={role}
              type="button"
              role="option"
              aria-selected={selected_role === role}
              onClick={() => setSelectedRole(role)}
              className="admin-role-row"
            >
              <span>{ROLE_DETAILS[role]?.label ?? role}</span>
              <span className="admin-role-caption">{ROLE_DETAILS[role]?.caption}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="admin-permissions-list">
        {manager.error ? (
          <div role="alert" className="admin-notice admin-notice-error mb-4">
            {manager.error}
          </div>
        ) : null}

        {is_admin_selected ? (
          <div className="admin-notice admin-notice-info mb-5">Admins and super admins can always do everything.</div>
        ) : !can_manage ? (
          <div className="admin-notice admin-notice-info mb-5">You can view these permissions. Only account admins can change them.</div>
        ) : null}

        {grouped_definitions.map((group) => (
          <section key={group.key || "all"} className="mb-6 last:mb-0">
            <h3 className="admin-group-title">{group.label}</h3>
            <div className="admin-checkbox-list">
              {group.definitions.map((definition) => {
                if (is_admin_selected) {
                  return (
                    <PermissionCheckbox
                      key={definition.key}
                      definition={definition}
                      is_checked
                      is_disabled
                      is_saving={false}
                      onToggle={() => undefined}
                    />
                  );
                }
                const role = selected_role as AccountPermissionRole;
                return (
                  <PermissionCheckbox
                    key={definition.key}
                    definition={definition}
                    is_checked={permissions.matrix[role]?.[definition.key] ?? true}
                    is_disabled={!can_manage}
                    is_saving={manager.saving_cell === `${role}.${definition.key}`}
                    onToggle={() => void manager.togglePermission(role, definition.key)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default PermissionsSection;
