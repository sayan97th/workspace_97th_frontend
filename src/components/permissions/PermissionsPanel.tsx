"use client";
import React from "react";
import { ChatBubbleIcon } from "@/icons/workspace-icons";
import PermissionsGroupCard from "./PermissionsGroupCard";
import PermissionsRoleList from "./PermissionsRoleList";
import type { PermissionsManagerApi } from "./usePermissionsManager";

export type PermissionsPanelProps = {
  manager: PermissionsManagerApi;
  onGiveFeedback?: () => void;
  roleListTitle?: string;
};

/**
 * Full two-column Permissions view (role list + permission checklist), driven entirely
 * by {@link usePermissionsManager}. Kept generic over its `manager`/config so any other
 * role/permission-matrix screen in the app can reuse it with a different {@link PermissionsConfig}.
 */
const PermissionsPanel: React.FC<PermissionsPanelProps> = ({ manager, onGiveFeedback, roleListTitle }) => (
  <div className="mt-6 flex items-start gap-0 pb-[60px]">
    <PermissionsRoleList
      roles={manager.roles}
      active_role_id={manager.active_role.id}
      onSelectRole={manager.selectRole}
      title={roleListTitle}
    />

    <div className="min-w-0 flex-1 border-l border-shell-border pl-8">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[17px] font-bold text-shell-text">{manager.active_role.label} permissions</div>
        <button
          type="button"
          onClick={onGiveFeedback}
          className="flex flex-none items-center gap-1.5 text-shell-text-secondary hover:text-shell-text"
        >
          <ChatBubbleIcon size={15} />
          <span className="text-[13.5px] font-medium">Give feedback</span>
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-[26px]">
        {manager.groups.map((group) => (
          <PermissionsGroupCard key={group.id} group={group} isChecked={manager.isChecked} onToggle={manager.togglePermission} />
        ))}
      </div>
    </div>
  </div>
);

export default PermissionsPanel;
