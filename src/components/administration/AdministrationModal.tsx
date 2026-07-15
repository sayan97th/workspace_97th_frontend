"use client";
import React, { useEffect } from "react";
import { TEAMS_ROSTER } from "@/data/teams-data";
import {
  ADMIN_AUDIT_LOG,
  ADMIN_DEPARTMENTS,
  ADMIN_ORPHAN_BOARDS,
  ADMIN_SESSIONS,
  ADMIN_USERS,
} from "@/data/administration-data";
import { CloseIcon } from "@/icons/workspace-icons";
import AdministrationNav from "./AdministrationNav";
import { useAdministrationManager } from "./useAdministrationManager";
import type { AdministrationManagerApi } from "./useAdministrationManager";
import type { AdminSectionId } from "./types";
import ProfileSection from "./sections/ProfileSection";
import AccountSection from "./sections/AccountSection";
import CustomizationSection from "./sections/CustomizationSection";
import BrandingSection from "./sections/BrandingSection";
import UsersSection from "./sections/UsersSection";
import DepartmentsSection from "./sections/DepartmentsSection";
import BoardOwnershipSection from "./sections/BoardOwnershipSection";
import AutomationsOwnershipSection from "./sections/AutomationsOwnershipSection";
import AuthenticationSection from "./sections/AuthenticationSection";
import AuditSection from "./sections/AuditSection";
import AdvancedSection from "./sections/AdvancedSection";
import SessionsSection from "./sections/SessionsSection";

export type AdministrationModalProps = {
  is_open: boolean;
  onClose: () => void;
};

const SECTION_TITLES: Record<AdminSectionId, string> = {
  profile: "Profile",
  account: "Account",
  customization: "Customization",
  branding: "Branding",
  users: "User management",
  departments: "Departments",
  board_ownership: "Board ownership",
  automations_ownership: "Automations ownership",
  authentication: "Security & authentication",
  audit: "Audit log",
  advanced: "Advanced",
  sessions: "Active user sessions",
};

const SECTION_PANELS: Record<AdminSectionId, React.FC<{ admin: AdministrationManagerApi }>> = {
  profile: ProfileSection,
  account: AccountSection,
  customization: CustomizationSection,
  branding: BrandingSection,
  users: UsersSection,
  departments: DepartmentsSection,
  board_ownership: BoardOwnershipSection,
  automations_ownership: AutomationsOwnershipSection,
  authentication: AuthenticationSection,
  audit: AuditSection,
  advanced: AdvancedSection,
  sessions: SessionsSection,
};

/**
 * Account-wide "Administration" dialog opened from {@link AccountMenu}'s Administration
 * entry: a nested left nav ({@link AdministrationNav}) and a right content pane that swaps
 * between the twelve settings pages. Structured the same way as {@link TrashModal} and
 * {@link TeamsModal} — a `use*Manager` hook owns all the state, every section below stays
 * presentational over its output.
 */
const AdministrationModal: React.FC<AdministrationModalProps> = ({ is_open, onClose }) => {
  const admin = useAdministrationManager({
    users: ADMIN_USERS,
    departments: ADMIN_DEPARTMENTS,
    audit_log: ADMIN_AUDIT_LOG,
    sessions: ADMIN_SESSIONS,
    members: TEAMS_ROSTER,
    orphan_boards: ADMIN_ORPHAN_BOARDS,
  });

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  if (!is_open) return null;

  const ActivePanel = SECTION_PANELS[admin.active_section];

  return (
    <div role="dialog" aria-modal="true" aria-label="Administration" className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[301] flex h-[760px] max-h-[92vh] w-[1180px] max-w-full overflow-hidden rounded-[18px] border border-shell-border bg-shell-panel font-outfit text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-[18px] top-4 z-[2] flex h-[30px] w-[30px] items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover"
        >
          <CloseIcon size={15} />
        </button>

        <AdministrationNav admin={admin} />

        <div className="shell-scrollbar min-w-0 flex-1 overflow-y-auto px-11 pb-11 pt-9">
          <div className="mb-6 text-[24px] font-extrabold tracking-[-0.01em]">
            {SECTION_TITLES[admin.active_section]}
          </div>
          <ActivePanel admin={admin} />
        </div>
      </div>
    </div>
  );
};

export default AdministrationModal;
