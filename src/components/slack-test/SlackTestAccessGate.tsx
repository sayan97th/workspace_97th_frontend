"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

/** Matches the `role:super_admin,admin` gate on the Slack diagnostics endpoints. */
const SLACK_TEST_ROLES = ["super_admin", "admin"];

/** Renders `children` only for account administrators, the Slack test pages are admin only. */
const SlackTestAccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();

  if (is_auth_loading) return null;

  if (!hasAnyRole(...SLACK_TEST_ROLES)) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-lg font-semibold text-shell-text">You don&apos;t have access to this page</h1>
        <p className="mt-1 text-sm text-shell-text-secondary">Only account administrators can test the Slack integration.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default SlackTestAccessGate;
