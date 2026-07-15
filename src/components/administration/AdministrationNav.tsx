"use client";
import React from "react";
import type { AdministrationManagerApi } from "./useAdministrationManager";
import type { AdminSectionId } from "./types";

export type AdministrationNavProps = {
  admin: AdministrationManagerApi;
};

const rowClass = (is_active: boolean, indent: boolean) =>
  `flex cursor-pointer items-center gap-[6px] rounded-lg py-2 text-[13.5px] transition-colors ${
    indent ? "pl-[30px] pr-[10px]" : "px-[10px]"
  } ${is_active ? "font-bold text-brand-200" : "font-medium text-[#b7c0c0] hover:bg-white/[0.06]"}`;

const groupHeaderClass = "mb-1.5 px-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#7e8889]";

const NavRow: React.FC<{ label: string; is_active: boolean; onSelect: () => void; indent?: boolean }> = ({
  label,
  is_active,
  onSelect,
  indent = false,
}) => (
  <div onClick={onSelect} className={rowClass(is_active, indent)}>
    {label}
  </div>
);

const NavGroupToggle: React.FC<{
  label: string;
  is_expanded: boolean;
  is_active: boolean;
  onToggle: () => void;
}> = ({ label, is_expanded, is_active, onToggle }) => (
  <div onClick={onToggle} className={rowClass(is_active, false)}>
    <span
      className="flex flex-none items-center justify-center text-[#8a9495] transition-transform duration-150"
      style={{ width: 14, height: 14, transform: is_expanded ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12">
        <path
          d="M4.5 3 L7.5 6 L4.5 9"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    {label}
  </div>
);

/**
 * Left sidebar of {@link AdministrationModal}: nested nav groups (General / Workspace)
 * fully driven by {@link useAdministrationManager}'s output, mirroring how
 * {@link TeamsRail} stays presentational over `useTeamsManager`.
 */
const AdministrationNav: React.FC<AdministrationNavProps> = ({ admin }) => {
  const isActive = (id: AdminSectionId) => admin.active_section === id;

  return (
    <div className="scrollnice flex h-full w-[264px] flex-none flex-col overflow-y-auto border-r border-white/[0.07] bg-[#0b1616] px-[14px] py-5">
      <div className="mb-[22px] flex items-center gap-[10px] px-2">
        <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] bg-brand-500 text-[11px] font-bold text-white">
          97
        </span>
        <span className="text-[15px] font-bold text-[#e9eded]">Administration</span>
      </div>

      <div className={groupHeaderClass}>General</div>
      <NavRow label="Profile" is_active={isActive("profile")} onSelect={() => admin.selectSection("profile")} />
      <div className="mb-4">
        <NavRow label="Account" is_active={isActive("account")} onSelect={() => admin.selectSection("account")} />
      </div>

      <div className={groupHeaderClass}>Workspace</div>

      <NavGroupToggle
        label="Customization"
        is_expanded={admin.is_customization_expanded}
        is_active={isActive("customization")}
        onToggle={() => admin.selectSection("customization")}
      />
      {admin.is_customization_expanded ? (
        <NavRow
          label="Branding"
          is_active={isActive("branding")}
          onSelect={() => admin.selectSection("branding")}
          indent
        />
      ) : null}

      <NavGroupToggle
        label="Directory"
        is_expanded={admin.is_directory_expanded}
        is_active={admin.active_group === "directory"}
        onToggle={admin.toggleDirectoryExpanded}
      />
      {admin.is_directory_expanded ? (
        <>
          <NavRow label="Users" is_active={isActive("users")} onSelect={() => admin.selectSection("users")} indent />
          <NavRow
            label="Departments"
            is_active={isActive("departments")}
            onSelect={() => admin.selectSection("departments")}
            indent
          />
          <NavRow
            label="Board ownership"
            is_active={isActive("board_ownership")}
            onSelect={() => admin.selectSection("board_ownership")}
            indent
          />
          <NavRow
            label="Automations ownership"
            is_active={isActive("automations_ownership")}
            onSelect={() => admin.selectSection("automations_ownership")}
            indent
          />
        </>
      ) : null}

      <NavGroupToggle
        label="Security"
        is_expanded={admin.is_security_expanded}
        is_active={admin.active_group === "security"}
        onToggle={admin.toggleSecurityExpanded}
      />
      {admin.is_security_expanded ? (
        <>
          <NavRow
            label="Authentication"
            is_active={isActive("authentication")}
            onSelect={() => admin.selectSection("authentication")}
            indent
          />
          <NavRow label="Audit" is_active={isActive("audit")} onSelect={() => admin.selectSection("audit")} indent />
          <NavRow
            label="Advanced"
            is_active={isActive("advanced")}
            onSelect={() => admin.selectSection("advanced")}
            indent
          />
          <NavRow
            label="Sessions"
            is_active={isActive("sessions")}
            onSelect={() => admin.selectSection("sessions")}
            indent
          />
        </>
      ) : null}
    </div>
  );
};

export default AdministrationNav;
