"use client";
import React, { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
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
import AccountSection from "./sections/AccountSection";
import UserDefaultsSection from "./sections/UserDefaultsSection";
import IntegrationsSection from "./sections/IntegrationsSection";
import UsersSection from "./sections/UsersSection";
import DepartmentsSection from "./sections/DepartmentsSection";
import BoardOwnershipSection from "./sections/BoardOwnershipSection";
import AuthenticationSection from "./sections/AuthenticationSection";
import AuditSection from "./sections/AuditSection";
import AdvancedSection from "./sections/AdvancedSection";
import SessionsSection from "./sections/SessionsSection";
import UsageSection from "./sections/UsageSection";
import ProfileFieldsSection from "./sections/ProfileFieldsSection";
import ContentDirectorySection from "./sections/ContentDirectorySection";
import TidyUpSection from "./sections/TidyUpSection";
import PermissionsSection from "./sections/PermissionsSection";
import {
  DEFAULT_ADMINISTRATION_SECTION,
  canSeeAdministrationItem,
  findAdministrationItem,
  parseAdministrationSection,
} from "./administrationNavConfig";
import "./administration.css";

/** Roles allowed onto the Administration view at all, mirroring the Laravel API's `/admin` route group floor. */
const ADMINISTRATION_ROLES = ["super_admin", "admin", "staff"];

/**
 * Account wide "Administration" page, mounted at `/administration` and styled after monday.com's
 * administration: a top bar with Back and the page name, the grouped rail
 * ({@link AdministrationRail}) on a soft gray page, and the active section inside a white card
 * with its title and subtitle. Styles live in `administration.css`.
 *
 * The active section is the `?section=` query param, so a refresh, the browser Back button and
 * links such as `/administration?section=integrations` all land on the same page.
 *
 * Every section owns its own backend driven `use<Section>Manager` hook. Gated to
 * `super_admin`/`admin`/`staff`, matching the API's `/admin` route group floor, and tightened
 * per section to match each section's own backend role gate.
 */
const AdministrationView: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const search_params = useSearchParams();
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const { branding } = useBranding();
  const active_section = parseAdministrationSection(search_params.get("section")) ?? DEFAULT_ADMINISTRATION_SECTION;

  const selectSection = useCallback(
    (section_id: AdminSectionId) => {
      const next_params = new URLSearchParams(search_params.toString());
      next_params.set("section", section_id);
      router.replace(`${pathname}?${next_params.toString()}`, { scroll: false });
    },
    [pathname, router, search_params]
  );

  const account_settings = useAccountSettingsManager();
  const departments = useDepartmentsManager();
  const users = useUsersManager(departments.department_rows);
  const { reloadUsers } = users;

  // Department assignments and profile fields can change from their own pages, so refresh the roster on each visit.
  useEffect(() => {
    if (active_section === "users") reloadUsers();
  }, [active_section, reloadUsers]);

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

  const active_item = findAdministrationItem(active_section);
  const can_open_section = !active_item || canSeeAdministrationItem(active_item, hasAnyRole);

  const renderActiveSection = () => {
    if (!can_open_section) {
      return <div className="admin-notice admin-notice-info">Only account admins can open {active_item?.label}.</div>;
    }

    switch (active_section) {
      case "account":
        return <AccountSection account={account_settings} />;
      case "user_defaults":
        return <UserDefaultsSection account={account_settings} />;
      case "profile_fields":
        return <ProfileFieldsSection />;
      case "users":
        return <UsersSection users={users} />;
      case "departments":
        return <DepartmentsSection departments={departments} onGoToUsers={() => selectSection("users")} />;
      case "board_ownership":
        return <BoardOwnershipSection board_ownership={board_ownership} />;
      case "authentication":
        return <AuthenticationSection authentication={authentication} />;
      case "sessions":
        return <SessionsSection sessions={sessions} />;
      case "audit":
        return <AuditSection audit={audit} />;
      case "advanced":
        return <AdvancedSection advanced={advanced} />;
      case "integrations":
        return <IntegrationsSection />;
      case "usage":
        return <UsageSection />;
      case "tidy_up":
        return <TidyUpSection />;
      case "content_directory":
        return <ContentDirectorySection />;
      case "permissions":
        return <PermissionsSection />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-shell administration-theme">
      <header className="admin-topbar">
        <button type="button" onClick={() => router.back()} className="admin-back-button">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Back
        </button>
        <h1 className="admin-topbar-title">
          <strong>{branding.company_name}</strong> administration
        </h1>
      </header>

      <div className="admin-body">
        <AdministrationRail active_section={active_section} onSelectSection={selectSection} />

        <section className="admin-card" aria-labelledby="admin-page-title">
          <div className="admin-page-header">
            <div className="min-w-0">
              <h2 id="admin-page-title" className="admin-page-title">
                {active_item?.title ?? active_item?.label}
              </h2>
              {active_item?.description && can_open_section ? (
                <p className="admin-page-subtitle">{active_item.description}</p>
              ) : null}
            </div>
          </div>

          <div key={active_section} className="admin-page-content shell-scrollbar">
            {renderActiveSection()}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdministrationView;
