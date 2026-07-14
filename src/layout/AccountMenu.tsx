"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import UserAvatar from "@/components/common/UserAvatar";
import { getUserDisplayName } from "@/lib/user";

/* ------------------------------------------------------------------ *
 * Inline icons — copied from the approved "97 Workspace Menu" design
 * so the account panel stays pixel-faithful without bloating the
 * shared icon module with single-use glyphs.
 * ------------------------------------------------------------------ */
const iconBaseProps = {
  width: 15,
  height: 15,
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
const DevelopersGlyph = () => (
  <svg {...iconBaseProps}>
    <path
      d="M6 5 L2.5 8 L6 11 M10 5 L13.5 8 L10 11"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
    <circle cx="8" cy="8" r="2.2" />
    <path
      d="M8 1.8 v2 M8 12.2 v2 M1.8 8 h2 M12.2 8 h2 M3.6 3.6 l1.4 1.4 M11 11 l1.4 1.4 M12.4 3.6 l-1.4 1.4 M5 11 l-1.4 1.4"
      strokeLinecap="round"
    />
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
const LogOutGlyph = () => (
  <svg {...iconBaseProps}>
    <path
      d="M10 2.5 H12.5 A1 1 0 0 1 13.5 3.5 V12.5 A1 1 0 0 1 12.5 13.5 H10 M9 8 H2.5 M5 5.5 L2.5 8 L5 10.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const MarketplaceGlyph = () => (
  <svg {...iconBaseProps}>
    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
    <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
    <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
    <path d="M11.25 9 v4.5 M9 11.25 h4.5" strokeLinecap="round" />
  </svg>
);
const MobileGlyph = () => (
  <svg {...iconBaseProps}>
    <rect x="4.5" y="1.8" width="7" height="12.4" rx="1.6" />
    <line x1="7" y1="12.2" x2="9" y2="12.2" strokeLinecap="round" />
  </svg>
);
const LabsGlyph = () => (
  <svg {...iconBaseProps}>
    <path d="M8 2 a4 4 0 0 0-2 7.5 V11 h4 V9.5 A4 4 0 0 0 8 2Z" strokeLinejoin="round" />
    <line x1="6.4" y1="13" x2="9.6" y2="13" strokeLinecap="round" />
  </svg>
);
const ShortcutsGlyph = () => (
  <svg {...iconBaseProps}>
    <path
      d="M2 5 h12 M4 5 V3.5 M12 5 V3.5 M2 5 v7 a1 1 0 0 0 1 1 h10 a1 1 0 0 0 1-1 V5 M5.5 8.5 L7 10 L10.5 6.5"
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
const HelpGlyph = () => (
  <svg {...iconBaseProps}>
    <circle cx="8" cy="8" r="6" />
    <path d="M6.3 6.2 a1.8 1.8 0 0 1 3.4 .8 c0 1.2 -1.7 1.4 -1.7 2.6" strokeLinecap="round" />
    <circle cx="8" cy="11.4" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);
const ThemeGlyph = () => (
  <svg {...iconBaseProps}>
    <path d="M9.8 2.2 a5.8 5.8 0 1 0 4 8.4 A4.6 4.6 0 0 1 9.8 2.2Z" strokeLinejoin="round" />
  </svg>
);
const ChevronGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
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
  <svg {...iconBaseProps} className="flex-none">
    <path
      d="M8 2 C5.8 2 4.3 3.6 4.3 5.8 V8.5 L3 11 H13 L11.7 8.5 V5.8 C11.7 3.6 10.2 2 8 2Z"
      strokeLinejoin="round"
    />
    <line x1="2.5" y1="13.5" x2="13.5" y2="2.5" strokeLinecap="round" />
  </svg>
);

/* ------------------------------------------------------------------ */

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
};

const rowClass =
  "flex w-full items-center gap-[11px] rounded-lg px-2 py-2 text-left text-[13.5px] font-medium text-[#D7DCDC] transition-colors hover:bg-white/[0.07]";

const MenuRow: React.FC<{ item: MenuItem; trailing?: React.ReactNode }> = ({
  item,
  trailing,
}) => (
  <button type="button" onClick={item.onSelect} className={rowClass}>
    <span className="flex w-4 flex-none justify-center text-[#9AA4A5]">{item.icon}</span>
    {item.label}
    {trailing ? <span className="ml-auto flex text-[#8A9495]">{trailing}</span> : null}
  </button>
);

const sectionLabelClass =
  "mb-2 text-[11.5px] font-semibold tracking-[0.04em] text-[#7E8889]";

export type AccountMenuProps = {
  is_open: boolean;
  onClose: () => void;
  /** Opens the invite-members flow owned by the top bar. */
  onInviteMembers?: () => void;
  /** Opens the Teams directory owned by the top bar. */
  onOpenTeams?: () => void;
  /** Organization / workspace name shown in the panel header. */
  organization_name?: string;
};

/**
 * Account panel triggered from the top-bar avatar. Mirrors the approved
 * "97 Workspace Menu" design and wires the functional entries (My profile,
 * Log out, Invite members, Change theme) to the existing app plumbing.
 */
const AccountMenu: React.FC<AccountMenuProps> = ({
  is_open,
  onClose,
  onInviteMembers,
  onOpenTeams,
  organization_name = "97th Floor",
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [do_not_disturb, setDoNotDisturb] = useState(false);

  // Close on Escape while the panel is open.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open) return null;

  const goTo = (href: string) => () => {
    onClose();
    router.push(href);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace("/signin");
    } finally {
      onClose();
    }
  };

  const handleInvite = () => {
    onClose();
    onInviteMembers?.();
  };

  const handleOpenTeams = () => {
    onClose();
    onOpenTeams?.();
  };

  const account_items: MenuItem[] = [
    { label: "My profile", icon: <ProfileGlyph />, onSelect: goTo("/profile") },
    { label: "Developers", icon: <DevelopersGlyph />, onSelect: onClose },
    { label: "Trash", icon: <TrashGlyph />, onSelect: onClose },
    { label: "Archive", icon: <ArchiveGlyph />, onSelect: onClose },
    { label: "Administration", icon: <AdministrationGlyph />, onSelect: onClose },
    { label: "Teams", icon: <TeamsGlyph />, onSelect: handleOpenTeams },
    { label: "Log out", icon: <LogOutGlyph />, onSelect: handleSignOut },
  ];

  const explore_items: MenuItem[] = [
    { label: "App marketplace", icon: <MarketplaceGlyph />, onSelect: onClose },
    { label: "Mobile app", icon: <MobileGlyph />, onSelect: onClose },
    { label: "97 Labs", icon: <LabsGlyph />, onSelect: onClose },
    { label: "Shortcuts", icon: <ShortcutsGlyph />, onSelect: onClose },
  ];

  const display_name = getUserDisplayName(user);

  return (
    <>
      {/* Click-away layer */}
      <div className="fixed inset-0 z-[200]" onClick={onClose} aria-hidden="true" />

      <div
        role="menu"
        aria-label="Account menu"
        className="fixed right-3 top-[58px] z-[201] w-[448px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] border border-white/10 bg-[#0F1C1C] font-outfit text-[#E9EDED] shadow-[0_22px_54px_rgba(0,0,0,0.5)]"
      >
        {/* Header — current user + organization */}
        <div className="flex items-center gap-[11px] border-b border-white/[0.07] px-[18px] py-4">
          <UserAvatar user={user} size={30} className="!rounded-[7px]" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-bold leading-tight">
              {display_name}
            </span>
            <span className="truncate text-[12px] font-medium text-[#8A9495]">
              {organization_name}
            </span>
          </div>
        </div>

        {/* Two columns — Account / Explore */}
        <div className="flex gap-6 px-3 pb-2 pt-4">
          <div className="flex-1">
            <div className={`${sectionLabelClass} px-2`}>Account</div>
            {account_items.map((item) => (
              <MenuRow key={item.label} item={item} />
            ))}
          </div>
          <div className="flex-1">
            <div className={`${sectionLabelClass} px-2`}>Explore</div>
            {explore_items.map((item) => (
              <MenuRow key={item.label} item={item} />
            ))}
          </div>
        </div>

        {/* Shared actions */}
        <div className="px-2.5 pb-2 pt-1">
          <MenuRow
            item={{ label: "Invite members", icon: <InviteGlyph />, onSelect: handleInvite }}
          />
          <MenuRow item={{ label: "Get help", icon: <HelpGlyph />, onSelect: onClose }} />
          <MenuRow
            item={{ label: "Change theme", icon: <ThemeGlyph />, onSelect: toggleTheme }}
            trailing={
              <span className="flex items-center gap-2 text-[12px] capitalize">
                {theme}
                <ChevronGlyph />
              </span>
            }
          />
        </div>

        {/* Working status */}
        <div className="border-t border-white/[0.07] bg-[#0B1616] px-[18px] py-3.5">
          <div className="mb-[11px] text-[11.5px] font-semibold tracking-[0.04em] text-[#7E8889]">
            Working status
          </div>
          <div className="flex items-center gap-[11px]">
            <span className="text-[#9AA4A5]">
              <DoNotDisturbGlyph />
            </span>
            <span className="flex-1 text-[13.5px] font-medium text-[#D7DCDC]">
              Do not disturb
            </span>
            <DndOption
              label="On"
              is_active={do_not_disturb}
              onSelect={() => setDoNotDisturb(true)}
            />
            <DndOption
              label="Off"
              is_active={!do_not_disturb}
              onSelect={() => setDoNotDisturb(false)}
            />
            <button
              type="button"
              onClick={onClose}
              className="ml-1.5 flex items-center gap-[3px] text-[12.5px] text-[#8A9495] transition-colors hover:text-[#E9EDED]"
            >
              More
              <ChevronGlyph />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const DndOption: React.FC<{
  label: string;
  is_active: boolean;
  onSelect: () => void;
}> = ({ label, is_active, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`flex items-center gap-1.5 text-[13px] transition-colors ${
      is_active ? "text-brand-200" : "text-[#8A9495]"
    }`}
  >
    <span
      className={`flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 ${
        is_active ? "border-brand-200" : "border-[#8A9495]"
      }`}
    >
      {is_active && <span className="h-[7px] w-[7px] rounded-full bg-brand-200" />}
    </span>
    {label}
  </button>
);

export default AccountMenu;
