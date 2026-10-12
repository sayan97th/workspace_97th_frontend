"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import OrganizationLogo from "@/components/common/OrganizationLogo";
import MenuFlyout from "@/components/ui/dropdown/MenuFlyout";
import { boardTreeFontClassName } from "@/components/board/board-tree-font";
import { CheckIcon } from "@/icons/workspace-icons";
import { getUserDisplayName } from "@/lib/user";
import { profilePreferencesService } from "@/services/profile-preferences.service";
import "./account-menu.css";

/* ------------------------------------------------------------------ *
 * Inline icons, copied from the approved "97 Workspace Menu" design
 * so the account panel stays pixel faithful without bloating the
 * shared icon module with single use glyphs.
 * ------------------------------------------------------------------ */
const iconBaseProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.3,
};

const ProfileGlyph = () => (
  <svg {...iconBaseProps}>
    <circle cx="8" cy="5.5" r="2.6" />
    <path d="M3 13 c0-2.8 2.2-4.3 5-4.3 s5 1.5 5 4.3" strokeLinecap="round" />
  </svg>
);
const InvitationsGlyph = () => (
  <svg {...iconBaseProps}>
    <rect x="1.8" y="3.5" width="12.4" height="9" rx="1.2" />
    <path d="M2.2 4.3 L8 9 L13.8 4.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TrashGlyph = () => (
  <svg {...iconBaseProps}>
    <path
      d="M3 4.3 H13 M6 4.3 V3.2 A1 1 0 0 1 7 2.2 H9 A1 1 0 0 1 10 3.2 V4.3 M4.5 4.3 L5.1 12.6 A1 1 0 0 0 6.1 13.5 H9.9 A1 1 0 0 0 10.9 12.6 L11.5 4.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const ArchiveGlyph = () => (
  <svg {...iconBaseProps}>
    <rect x="2.2" y="2.8" width="11.6" height="3.2" rx="1" />
    <path d="M3.4 6 V12.5 A1 1 0 0 0 4.4 13.5 H11.6 A1 1 0 0 0 12.6 12.5 V6" />
  </svg>
);
const AdministrationGlyph = () => (
  <svg {...iconBaseProps}>
    <path
      d="M8 1.8 L9.2 2 L9.6 3.5 L10.8 4.1 L12.2 3.4 L13 4.3 L12.4 5.7 L12.9 6.9 L14.3 7.4 V8.6 L12.9 9.1 L12.4 10.3 L13 11.7 L12.2 12.6 L10.8 11.9 L9.6 12.5 L9.2 14 L8 14.2 L6.8 14 L6.4 12.5 L5.2 11.9 L3.8 12.6 L3 11.7 L3.6 10.3 L3.1 9.1 L1.7 8.6 V7.4 L3.1 6.9 L3.6 5.7 L3 4.3 L3.8 3.4 L5.2 4.1 L6.4 3.5 L6.8 2 Z"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const OrganizationGlyph = () => (
  <svg {...iconBaseProps}>
    <rect x="2.6" y="2.2" width="7.4" height="11.6" rx="1" />
    <path d="M10 6.2 H12.6 A0.8 0.8 0 0 1 13.4 7 V13.8 M1.8 13.8 H14.2 M5 5 H7.6 M5 7.6 H7.6 M5 10.2 H7.6" strokeLinecap="round" />
  </svg>
);
const TeamsGlyph = () => (
  <svg {...iconBaseProps}>
    <circle cx="5.5" cy="6" r="2" />
    <circle cx="10.5" cy="6" r="2" />
    <path
      d="M2 12.5 c0-2 1.5-3 3.5-3 s3.5 1 3.5 3 M8.5 12.5 c.2-2 1.7-3 3.5-3 s2 1 2 3"
      strokeLinecap="round"
    />
  </svg>
);
const UsersGlyph = () => (
  <svg {...iconBaseProps}>
    <circle cx="8" cy="5.2" r="2.4" />
    <path d="M3 13 c0-2.6 2.2-4 5-4 s5 1.4 5 4" strokeLinecap="round" />
  </svg>
);
const LogOutGlyph = () => (
  <svg {...iconBaseProps}>
    <path
      d="M10 2.5 H12.5 A1 1 0 0 1 13.5 3.5 V12.5 A1 1 0 0 1 12.5 13.5 H10 M9 8 H2.5 M5 5.5 L2.5 8 L5 10.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const InviteGlyph = () => (
  <svg {...iconBaseProps}>
    <circle cx="6" cy="5.2" r="2.4" />
    <path d="M1.8 13 c0-2.6 1.9-4 4.2-4 s4.2 1.4 4.2 4" strokeLinecap="round" />
    <path d="M12.5 5.5 V9.5 M10.5 7.5 H14.5" strokeLinecap="round" />
  </svg>
);
const ThemeGlyph = () => (
  <svg {...iconBaseProps}>
    <path d="M9.8 2.2 a5.8 5.8 0 1 0 4 8.4 A4.6 4.6 0 0 1 9.8 2.2Z" strokeLinejoin="round" />
  </svg>
);
const LightGlyph = () => (
  <svg {...iconBaseProps}>
    <circle cx="8" cy="8" r="3" />
    <path
      d="M8 1.6 v1.8 M8 12.6 v1.8 M1.6 8 h1.8 M12.6 8 h1.8 M3.5 3.5 l1.3 1.3 M11.2 11.2 l1.3 1.3 M12.5 3.5 l-1.3 1.3 M4.8 11.2 l-1.3 1.3"
      strokeLinecap="round"
    />
  </svg>
);
const SystemGlyph = () => (
  <svg {...iconBaseProps}>
    <rect x="2" y="3" width="12" height="8" rx="1" />
    <path d="M6 13.5 h4 M8 11 v2.5" strokeLinecap="round" />
  </svg>
);
const ChevronGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
    <path
      d="M4.5 3 L7.5 6 L4.5 9"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const DoNotDisturbGlyph = () => (
  <svg {...iconBaseProps}>
    <path
      d="M8 2 C5.8 2 4.3 3.6 4.3 5.8 V8.5 L3 11 H13 L11.7 8.5 V5.8 C11.7 3.6 10.2 2 8 2Z"
      strokeLinejoin="round"
    />
    <line x1="2.5" y1="13.5" x2="13.5" y2="2.5" strokeLinecap="round" />
  </svg>
);

/* Working status glyphs: a filled disc with the symbol cut out, as monday.com draws them. */
const statusDiscProps = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none" as const };
const status_cutout = "var(--account-menu-surface)";

const WorkFromHomeGlyph = () => (
  <svg {...statusDiscProps}>
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path d="M4.8 8 L8 5.2 L11.2 8 V11 H9 V9.2 H7 V11 H4.8 Z" fill={status_cutout} />
  </svg>
);
const OutSickGlyph = () => (
  <svg {...statusDiscProps}>
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path d="M8 4.8 V11.2 M4.8 8 H11.2" stroke={status_cutout} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);
const OnBreakGlyph = () => (
  <svg {...statusDiscProps}>
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path
      d="M4.6 6 H7 L4.6 9 H7 M8.6 7.4 H11.2 L8.6 10.6 H11.2"
      stroke={status_cutout}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const OutOfOfficeGlyph = () => (
  <svg {...statusDiscProps}>
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path d="M4.8 8 H11.2" stroke={status_cutout} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);
const WorkingOutsideGlyph = () => (
  <svg {...statusDiscProps}>
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path
      d="M5.4 10.6 A1.7 1.7 0 0 1 5.6 7.2 A2.5 2.5 0 0 1 10.4 6.8 A1.9 1.9 0 0 1 10.6 10.6 Z"
      fill={status_cutout}
    />
  </svg>
);
const FamilyTimeGlyph = () => (
  <svg {...statusDiscProps}>
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path
      d="M8 11.2 L5.2 8.4 A1.6 1.6 0 0 1 8 6.2 A1.6 1.6 0 0 1 10.8 8.4 Z"
      fill={status_cutout}
    />
  </svg>
);

/* ------------------------------------------------------------------ */

/** The default "available" status, the one every other status is cleared back to. */
const DEFAULT_WORKING_STATUS = "office";

/** Away statuses listed under "More", same keys as the API `WorkingStatus` enum and My Profile. */
const WORKING_STATUS_OPTIONS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "wfh", label: "Working from home", icon: <WorkFromHomeGlyph /> },
  { key: "sick", label: "Out sick", icon: <OutSickGlyph /> },
  { key: "break", label: "On break", icon: <OnBreakGlyph /> },
  { key: "ooo", label: "Out of office", icon: <OutOfOfficeGlyph /> },
  { key: "outside", label: "Working outside", icon: <WorkingOutsideGlyph /> },
  { key: "family", label: "Family time", icon: <FamilyTimeGlyph /> },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { mode: "light", label: "Light", icon: <LightGlyph /> },
  { mode: "dark", label: "Dark", icon: <ThemeGlyph /> },
  { mode: "system", label: "System default", icon: <SystemGlyph /> },
];

type FlyoutId = "theme" | "status";

type MenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

const MenuRow: React.FC<{ item: MenuItem }> = ({ item }) => (
  <button type="button" role="menuitem" onClick={item.onSelect} className="account-menu__item">
    <span className="account-menu__icon">{item.icon}</span>
    <span className="account-menu__label">{item.label}</span>
  </button>
);

export type AccountMenuProps = {
  is_open: boolean;
  onClose: () => void;
  /** Opens the My Profile dialog owned by the top bar. */
  onOpenProfile?: () => void;
  /** Opens the invite members flow owned by the top bar. */
  onInviteMembers?: () => void;
  /** Navigates to the Teams directory page, provided by the top bar. */
  onOpenTeams?: () => void;
  /** Navigates to the Sent invitations page, provided by the top bar. */
  onOpenInvitations?: () => void;
  /** Opens the account Trash dialog owned by the top bar, defaulted to the Trash tab. */
  onOpenTrash?: () => void;
  /** Opens the account Trash dialog owned by the top bar, defaulted to the Archive tab. */
  onOpenArchive?: () => void;
  /** Opens Administration > Organization (company profile and branding). */
  onOpenOrganization?: () => void;
  /** Opens the account Administration dialog owned by the top bar. */
  onOpenAdministration?: () => void;
  /** Navigates to the site wide Users directory page, provided by the top bar. */
  onOpenUsers?: () => void;
  /** Organization name shown in the panel header. */
  organization_name?: string;
  /** Organization logo (Administration > Organization), the 97th mark when unset. */
  organization_logo_url?: string | null;
  organization_logo_dark_url?: string | null;
};

/**
 * Account panel triggered from the top bar avatar, laid out like monday.com's
 * avatar menu: organization header, Account and Manage columns, a Working
 * status footer whose Do not disturb switch and away statuses are saved through
 * `PATCH /api/profile/working-status`, and Log out at the very bottom.
 */
const AccountMenu: React.FC<AccountMenuProps> = ({
  is_open,
  onClose,
  onOpenProfile,
  onInviteMembers,
  onOpenTeams,
  onOpenInvitations,
  onOpenTrash,
  onOpenArchive,
  onOpenAdministration,
  onOpenOrganization,
  onOpenUsers,
  organization_name = "97th Floor",
  organization_logo_url = null,
  organization_logo_dark_url = null,
}) => {
  const router = useRouter();
  const { user, logout, hasAnyRole, refreshUser } = useAuth();
  const { theme_mode, setThemeMode } = useTheme();
  const theme_row_ref = useRef<HTMLButtonElement>(null);
  const status_link_ref = useRef<HTMLButtonElement>(null);
  const [open_flyout, setOpenFlyout] = useState<FlyoutId | null>(null);
  const [is_signing_out, setIsSigningOut] = useState(false);
  const [is_saving_status, setIsSavingStatus] = useState(false);
  // Optimistic copies of the saved values, so the radios and the check move on click.
  const [do_not_disturb, setDoNotDisturb] = useState(false);
  const [working_status, setWorkingStatus] = useState(DEFAULT_WORKING_STATUS);

  useEffect(() => {
    setDoNotDisturb(Boolean(user?.do_not_disturb));
    setWorkingStatus(user?.working_status ?? DEFAULT_WORKING_STATUS);
  }, [user?.do_not_disturb, user?.working_status]);

  useEffect(() => {
    if (!is_open) setOpenFlyout(null);
  }, [is_open]);

  // Escape closes an open flyout first, then the panel itself.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (open_flyout) setOpenFlyout(null);
      else onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, open_flyout, onClose]);

  if (!is_open) return null;

  /** Closes the panel before running a row's action, so dialogs open on a clean screen. */
  const runAndClose = (action?: () => void) => () => {
    onClose();
    action?.();
  };

  const toggleFlyout = (flyout_id: FlyoutId) => () =>
    setOpenFlyout((current) => (current === flyout_id ? null : flyout_id));

  const closeFlyout = () => setOpenFlyout(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      router.replace("/signin");
    } finally {
      setIsSigningOut(false);
      onClose();
    }
  };

  const saveWorkingStatus = async (
    payload: { do_not_disturb?: boolean; working_status?: string },
    rollback: () => void
  ) => {
    setIsSavingStatus(true);
    try {
      await profilePreferencesService.updateWorkingStatus(payload);
      await refreshUser();
    } catch {
      rollback();
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleDoNotDisturbChange = (next_value: boolean) => {
    if (next_value === do_not_disturb) return;
    const previous_value = do_not_disturb;
    setDoNotDisturb(next_value);
    void saveWorkingStatus({ do_not_disturb: next_value }, () => setDoNotDisturb(previous_value));
  };

  /** Picking the active status again clears it back to the default "In the office". */
  const handleWorkingStatusSelect = (status_key: string) => {
    const previous_status = working_status;
    const next_status = status_key === working_status ? DEFAULT_WORKING_STATUS : status_key;
    setWorkingStatus(next_status);
    closeFlyout();
    void saveWorkingStatus({ working_status: next_status }, () => setWorkingStatus(previous_status));
  };

  const handleThemeSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
    closeFlyout();
  };

  /** Only super_admin/admin/staff may view the Users directory, mirroring the page's own gate. */
  const can_view_users = hasAnyRole("super_admin", "admin", "staff");

  const account_items: MenuItem[] = [
    { key: "profile", label: "My profile", icon: <ProfileGlyph />, onSelect: runAndClose(onOpenProfile) },
    { key: "invitations", label: "Invitations", icon: <InvitationsGlyph />, onSelect: runAndClose(onOpenInvitations) },
    { key: "teams", label: "Teams", icon: <TeamsGlyph />, onSelect: runAndClose(onOpenTeams) },
    { key: "trash", label: "Trash", icon: <TrashGlyph />, onSelect: runAndClose(onOpenTrash) },
    { key: "archive", label: "Archive", icon: <ArchiveGlyph />, onSelect: runAndClose(onOpenArchive) },
  ];

  const manage_items: MenuItem[] = [
    { key: "administration", label: "Administration", icon: <AdministrationGlyph />, onSelect: runAndClose(onOpenAdministration) },
    ...(can_view_users
      ? [
          { key: "organization", label: "Organization", icon: <OrganizationGlyph />, onSelect: runAndClose(onOpenOrganization) },
          { key: "users", label: "Users", icon: <UsersGlyph />, onSelect: runAndClose(onOpenUsers) },
        ]
      : []),
    { key: "invite", label: "Invite members", icon: <InviteGlyph />, onSelect: runAndClose(onInviteMembers) },
  ];

  const display_name = getUserDisplayName(user);
  const active_status = WORKING_STATUS_OPTIONS.find((option) => option.key === working_status);

  return (
    <>
      {/* Click away layer */}
      <div className="fixed inset-0 z-[200]" onClick={onClose} aria-hidden="true" />

      <div role="menu" aria-label="Account menu" className={`account-menu ${boardTreeFontClassName}`}>
        {/* Header: organization and signed in user */}
        <div className="account-menu__header">
          <OrganizationLogo
            logo_url={organization_logo_url}
            logo_dark_url={organization_logo_dark_url}
            company_name={organization_name}
            size={28}
            max_width={56}
          />
          <div className="account-menu__identity">
            <span className="account-menu__organization" title={organization_name}>
              {organization_name}
            </span>
            <span className="account-menu__user" title={user?.email ?? display_name}>
              {display_name}
              {user?.email ? `, ${user.email}` : ""}
            </span>
          </div>
        </div>

        {/* Two columns: Account / Manage */}
        <div className="account-menu__columns">
          <div className="account-menu__column" role="group" aria-label="Account">
            <div className="account-menu__title">Account</div>
            {account_items.map((item) => (
              <MenuRow key={item.key} item={item} />
            ))}
          </div>

          <div className="account-menu__column" role="group" aria-label="Manage">
            <div className="account-menu__title">Manage</div>
            {manage_items.map((item) => (
              <MenuRow key={item.key} item={item} />
            ))}
            <div className="account-menu__divider" role="separator" />
            <button
              ref={theme_row_ref}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={open_flyout === "theme"}
              onClick={toggleFlyout("theme")}
              className="account-menu__item"
            >
              <span className="account-menu__icon">
                <LightGlyph />
              </span>
              <span className="account-menu__label">Change theme</span>
              <span className="account-menu__chevron">
                <ChevronGlyph />
              </span>
            </button>
          </div>
        </div>

        {/* Working status */}
        <div className="account-menu__footer">
          <div className="account-menu__footer-title">
            Working status
            {active_status && (
              <span className="account-menu__current-status">
                <span className="account-menu__icon account-menu__icon--status">{active_status.icon}</span>
                <span>{active_status.label}</span>
              </span>
            )}
          </div>
          <div className="account-menu__status-row">
            <span className="account-menu__icon">
              <DoNotDisturbGlyph />
            </span>
            <span className="account-menu__status-label" id="account-menu-dnd-label">
              Do not disturb
            </span>
            <div role="radiogroup" aria-labelledby="account-menu-dnd-label" className="flex items-center">
              <DndOption label="On" is_active={do_not_disturb} is_disabled={is_saving_status} onSelect={() => handleDoNotDisturbChange(true)} />
              <DndOption label="Off" is_active={!do_not_disturb} is_disabled={is_saving_status} onSelect={() => handleDoNotDisturbChange(false)} />
            </div>
            <button
              ref={status_link_ref}
              type="button"
              aria-haspopup="menu"
              aria-expanded={open_flyout === "status"}
              onClick={toggleFlyout("status")}
              className="account-menu__link"
            >
              More
              <ChevronGlyph />
            </button>
          </div>
        </div>

        {/* Log out, kept apart at the very bottom */}
        <div className="account-menu__signout">
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={is_signing_out}
            className="account-menu__item"
          >
            <span className="account-menu__icon">
              <LogOutGlyph />
            </span>
            <span className="account-menu__label">{is_signing_out ? "Logging out..." : "Log out"}</span>
          </button>
        </div>
      </div>

      <MenuFlyout
        anchor_el={theme_row_ref.current}
        is_open={open_flyout === "theme"}
        onClose={closeFlyout}
        width={200}
        side="left"
        unstyled
      >
        <div role="menu" aria-label="Theme options" className={`account-menu-flyout ${boardTreeFontClassName}`}>
          {THEME_OPTIONS.map((option) => {
            const is_active = option.mode === theme_mode;
            return (
              <button
                key={option.mode}
                type="button"
                role="menuitemradio"
                aria-checked={is_active}
                onClick={() => handleThemeSelect(option.mode)}
                className="account-menu__item"
              >
                <span className="account-menu__icon">{option.icon}</span>
                <span className="account-menu__label">{option.label}</span>
                {is_active && (
                  <span className="account-menu__check">
                    <CheckIcon size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </MenuFlyout>

      <MenuFlyout
        anchor_el={status_link_ref.current}
        is_open={open_flyout === "status"}
        onClose={closeFlyout}
        width={220}
        side="left"
        unstyled
      >
        <div role="menu" aria-label="Working status options" className={`account-menu-flyout ${boardTreeFontClassName}`}>
          {WORKING_STATUS_OPTIONS.map((option) => {
            const is_active = option.key === working_status;
            return (
              <button
                key={option.key}
                type="button"
                role="menuitemradio"
                aria-checked={is_active}
                title={is_active ? "Click again to clear this status" : undefined}
                onClick={() => handleWorkingStatusSelect(option.key)}
                className="account-menu__item"
              >
                <span className="account-menu__icon account-menu__icon--status">{option.icon}</span>
                <span className="account-menu__label">{option.label}</span>
                {is_active && (
                  <span className="account-menu__check">
                    <CheckIcon size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </MenuFlyout>
    </>
  );
};

const DndOption: React.FC<{
  label: string;
  is_active: boolean;
  is_disabled: boolean;
  onSelect: () => void;
}> = ({ label, is_active, is_disabled, onSelect }) => (
  <button
    type="button"
    role="radio"
    aria-checked={is_active}
    disabled={is_disabled}
    onClick={onSelect}
    className="account-menu__radio"
  >
    <span className="account-menu__radio-dot" />
    {label}
  </button>
);

export default AccountMenu;
