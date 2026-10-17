"use client";
import React from "react";
import Link from "next/link";
import { LockIcon } from "@/icons/workspace-icons";
import "@/components/invitations/invitations.scss";
import "./users-directory.scss";
import { ACCESS_DENIED_DETAIL, ACCESS_DENIED_TITLE } from "./userManagementPermissions";

export type UsersAccessDeniedProps = {
  title?: string;
  detail?: string;
  /** Extra button next to "Back to home", e.g. "Back to users" on the edit page. */
  secondary_action?: React.ReactNode;
};

/**
 * Shown instead of Manage users when the signed in account lacks the role for it, or when the
 * API answers 403, so nobody lands on an empty table or a raw error.
 */
const UsersAccessDenied: React.FC<UsersAccessDeniedProps> = ({
  title = ACCESS_DENIED_TITLE,
  detail = ACCESS_DENIED_DETAIL,
  secondary_action,
}) => (
  <div className="invitations-theme ud-denied">
    <div className="ud-denied-card" role="alert">
      <span className="ud-denied-icon" aria-hidden>
        <LockIcon size={28} />
      </span>
      <h1 className="ud-denied-title">{title}</h1>
      <p className="ud-denied-detail">{detail}</p>
      <div className="ud-denied-actions">
        {secondary_action}
        <Link href="/workspace-home" className="inv-button inv-button-primary">
          Back to home
        </Link>
      </div>
    </div>
  </div>
);

export default UsersAccessDenied;
