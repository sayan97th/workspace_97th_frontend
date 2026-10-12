"use client";
import React from "react";
import { UserPlus } from "lucide-react";

/** The blue "Invite" header button of the Users and Invitations pages. */
const InviteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} className="admin-button admin-button-primary">
    <UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />
    Invite
  </button>
);

export default InviteButton;
