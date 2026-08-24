"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { useAuth } from "@/context/AuthContext";
import { ChevronRightIcon } from "@/icons/workspace-icons";
import AdministrationRail from "./AdministrationRail";
import { useAccountSettingsManager } from "./useAccountSettingsManager";
import { useDepartmentsManager } from "./useDepartmentsManager";
import { useUsersManager } from "./useUsersManager";
import { useBoardOwnershipManager } from "./useBoardOwnershipManager";
import { useAuthenticationSettingsManager } from "./useAuthenticationSettingsManager";
import { useAdvancedSettingsManager } from "./useAdvancedSettingsManager";
import { useAuditLogManager } from "./useAuditLogManager";
import { useAdminSessionsManager } from "./useAdminSessionsManager";
import type { AdminSectionId } from "./types";
import ProfileSection from "./sections/ProfileSection";
import AccountSection from "./sections/AccountSection";
import CustomizationSection from "./sections/CustomizationSection";
import BrandingSection from "./sections/BrandingSection";
import UsersSection from "./sections/UsersSection";
import DepartmentsSection from "./sections/DepartmentsSection";
import BoardOwnershipSection from "./sections/BoardOwnershipSection";
import AuthenticationSection from "./sections/AuthenticationSection";
import AuditSection from "./sections/AuditSection";
import AdvancedSection from "./sections/AdvancedSection";
import SessionsSection from "./sections/SessionsSection";

/** Roles allowed onto the Administration view at all, mirroring the Laravel API's `/admin` route group floor. */
const ADMINISTRATION_ROLES = ["super_admin", "admin", "staff"];

const SECTION_TITLES: Record<AdminSectionId, string> = {
  profile: "Profile",
  account: "Account",
  customization: "Customization",
  branding: "Branding",
  users: "User management",
  departments: "Departments",
  board_ownership: "Board ownership",
  authentication: "Security & authentication",
  audit: "Audit log",
  advanced: "Advanced",
  sessions: "Active user sessions",
};

/**
 * Account-wide "Administration" page, mounted at `/administration`. Replaces the old
 * floating `AdministrationModal` dialog with a full route: the same left rail
 * ({@link AdministrationRail}) and content pane, now filling the admin shell's content area
 * instead of a centered overlay, mirroring how `TeamsView` (`src/components/teams/TeamsView.tsx`)
 * and `ProfileView` already replaced their own modals.
 *
 * Every section owns its own backend-driven `use<Section>Manager` hook (matching the
 * `useTeamsManager`/`useProfileManager` convention) rather than one shared god-hook, since
 * each section is now a real, independent I/O boundary instead of mock local state.
 *
 * Gated to `super_admin`/`admin`/`staff`, matching the Laravel API's `/admin` route group
 * floor (`role:super_admin,admin,staff`), tightened further per-section to match each
 * section's own backend role gates (e.g. only `super_admin` can change platform roles).
 */
const AdministrationView: React.FC = () => {
  const router = useRouter();
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const [active_section, setActiveSection] = useState<AdminSectionId>("profile");

  const account_settings = useAccountSettingsManager();
  const departments = useDepartmentsManager();
  const users = useUsersManager(departments.department_rows);
  const board_ownership = useBoardOwnershipManager();
  const authentication = useAuthenticationSettingsManager();
  const advanced = useAdvancedSettingsManager();
  const audit = useAuditLogManager();
  const sessions = useAdminSessionsManager();

  if (is_auth_loading) {
    return <BoardLoadingSpinner />;
  }

  if (!hasAnyRole(...ADMINISTRATION_ROLES)) {
    return (
      <CenteredMessage
        title="You don't have access to this page"
        detail="Only account administrators and staff can view Administration settings."
      />
    );
  }

  const renderActiveSection = () => {
    switch (active_section) {
      case "profile":
        return <ProfileSection account={account_settings} />;
      case "account":
        return <AccountSection account={account_settings} />;
      case "customization":
        return <CustomizationSection onGoToBranding={() => setActiveSection("branding")} />;
      case "branding":
        return <BrandingSection />;
      case "departments":
        return <DepartmentsSection departments={departments} onGoToUsers={() => setActiveSection("users")} />;
      case "users":
        return <UsersSection users={users} />;
      case "board_ownership":
        return <BoardOwnershipSection board_ownership={board_ownership} />;
      case "authentication":
        return <AuthenticationSection authentication={authentication} />;
      case "audit":
        return <AuditSection audit={audit} />;
      case "advanced":
        return <AdvancedSection advanced={advanced} />;
      case "sessions":
        return <SessionsSection sessions={sessions} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-shell-bg text-shell-text">
      <div className="flex flex-none items-center gap-3 border-b border-shell-border px-6 py-3.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
        >
          <ChevronRightIcon className="rotate-180" size={11} />
          Back
        </button>
        <span className="h-4 w-px bg-shell-border" aria-hidden="true" />
        <span className="text-[13px] font-medium text-shell-text-muted">Administration</span>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AdministrationRail active_section={active_section} onSelectSection={setActiveSection} />

        <div className="shell-scrollbar min-w-0 flex-1 overflow-y-auto px-11 pb-11 pt-9">
          <div className="mb-6 text-[24px] font-extrabold tracking-[-0.01em]">{SECTION_TITLES[active_section]}</div>
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
};

export default AdministrationView;
