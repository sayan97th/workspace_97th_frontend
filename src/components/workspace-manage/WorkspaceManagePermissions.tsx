"use client";
import React, { useEffect, useState } from "react";
import { PermissionsPanel, usePermissionsManager } from "@/components/permissions";
import type { PermissionsConfig } from "@/components/permissions";
import {
  workspacePermissionsService,
  type WorkspacePermissionsPayload,
} from "@/services/workspace-permissions.service";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

const EMPTY_CONFIG: PermissionsConfig = { roles: [], groups: [], defaults: {} };

/**
 * Manage Workspace's "Permissions" tab: which actions each default workspace
 * role (owner / member / non-member) is allowed to perform, shared across
 * every workspace. Fetches the catalog + current grants from the API and
 * persists any toggle back to it (staff-only server-side).
 */
const WorkspaceManagePermissions: React.FC = () => {
  const [payload, setPayload] = useState<WorkspacePermissionsPayload | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggle_error, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    workspacePermissionsService
      .getPermissions()
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load workspace permissions.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const config: PermissionsConfig = payload
    ? { roles: payload.roles, groups: payload.groups, defaults: payload.matrix }
    : EMPTY_CONFIG;

  const manager = usePermissionsManager(config, (role_id, key, allowed) => {
    setToggleError(null);
    workspacePermissionsService
      .updatePermission({ role: role_id, permission_key: key, allowed })
      .catch(() => {
        setToggleError("You don't have permission to change this.");
        manager.togglePermission(key); // revert the optimistic flip
      });
  });

  if (is_loading) return <BoardLoadingSpinner />;
  if (error) return <CenteredMessage title="Something went wrong" detail={error} />;

  return (
    <div>
      {toggle_error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {toggle_error}
        </div>
      )}
      <PermissionsPanel manager={manager} />
    </div>
  );
};

export default WorkspaceManagePermissions;
