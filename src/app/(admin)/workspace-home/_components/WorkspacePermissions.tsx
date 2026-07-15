"use client";
import React, { useMemo } from "react";
import { PermissionsPanel, usePermissionsManager } from "@/components/permissions";
import type { PermissionsConfig } from "@/components/permissions";
import {
  WORKSPACE_PERMISSION_DEFAULTS,
  WORKSPACE_PERMISSION_GROUPS,
  WORKSPACE_PERMISSION_ROLES,
} from "@/data/permissions-data";

/**
 * The Workspace home "Permissions" tab: which actions each default workspace role
 * (owner / member / non-member) is allowed to perform. Composes the reusable
 * permissions kit — this file only wires the workspace-specific config.
 */
const WorkspacePermissions: React.FC = () => {
  const config: PermissionsConfig = useMemo(
    () => ({
      roles: WORKSPACE_PERMISSION_ROLES,
      groups: WORKSPACE_PERMISSION_GROUPS,
      defaults: WORKSPACE_PERMISSION_DEFAULTS,
    }),
    []
  );

  const manager = usePermissionsManager(config);

  return <PermissionsPanel manager={manager} />;
};

export default WorkspacePermissions;
