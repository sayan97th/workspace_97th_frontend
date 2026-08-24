"use client";
import React, { useEffect, useState } from "react";
import { ChevronRightIcon } from "@/icons/workspace-icons";
import {
  ADMINISTRATION_GENERAL_ITEMS,
  ADMINISTRATION_NAV_GROUPS,
  administrationGroupForSection,
  administrationItemsForGroup,
  type AdministrationNavItem,
} from "./administrationNavConfig";
import type { AdminNavGroupId, AdminSectionId } from "./types";

export type AdministrationRailProps = {
  active_section: AdminSectionId;
  onSelectSection: (id: AdminSectionId) => void;
};

const rowClass = (is_active: boolean, indent: boolean) =>
  `flex w-full cursor-pointer items-center gap-[9px] rounded-lg py-2 text-left text-[13.5px] transition-colors ${
    indent ? "pl-[30px] pr-[10px]" : "px-[10px]"
  } ${is_active ? "bg-shell-hover-strong font-bold text-brand-200" : "font-medium text-shell-text-secondary hover:bg-shell-hover"}`;

const groupHeaderClass = "mb-1.5 px-2 text-[11px] font-bold uppercase tracking-[0.06em] text-shell-text-faint";

const NavRow: React.FC<{ item: AdministrationNavItem; is_active: boolean; onSelect: () => void; indent?: boolean }> = ({
  item,
  is_active,
  onSelect,
  indent = false,
}) => {
  const Icon = item.icon;
  return (
    <button type="button" onClick={onSelect} className={rowClass(is_active, indent)}>
      <span className="flex flex-none items-center justify-center text-shell-text-muted">
        <Icon size={15} />
      </span>
      {item.label}
    </button>
  );
};

const NavGroupToggle: React.FC<{
  label: string;
  is_expanded: boolean;
  is_active: boolean;
  onToggle: () => void;
}> = ({ label, is_expanded, is_active, onToggle }) => (
  <button type="button" onClick={onToggle} className={rowClass(is_active, false)}>
    <span
      className="flex flex-none items-center justify-center text-shell-text-muted transition-transform duration-150"
      style={{ width: 14, height: 14, transform: is_expanded ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      <ChevronRightIcon size={10} />
    </span>
    {label}
  </button>
);

/**
 * Left rail of the Administration view: driven entirely by `administrationNavConfig`
 * instead of hardcoded JSX, so adding or reordering a section only means editing that one
 * config file. Group expand/collapse is presentational-only local state (a single
 * `Record<AdminNavGroupId, boolean>` instead of three separate booleans), and auto-expands
 * whichever group contains the active section, including when navigation arrives from a
 * section's own internal link (see `CustomizationSection`/`DepartmentsSection`).
 */
const AdministrationRail: React.FC<AdministrationRailProps> = ({ active_section, onSelectSection }) => {
  const [expanded_groups, setExpandedGroups] = useState<Record<AdminNavGroupId, boolean>>({
    customization: true,
    directory: true,
    security: true,
  });

  useEffect(() => {
    const group = administrationGroupForSection(active_section);
    if (!group) return;
    setExpandedGroups((current) => (current[group] ? current : { ...current, [group]: true }));
  }, [active_section]);

  const toggleGroup = (id: AdminNavGroupId) =>
    setExpandedGroups((current) => ({ ...current, [id]: !current[id] }));

  return (
    <div className="scrollnice flex h-full w-[264px] flex-none flex-col overflow-y-auto border-r border-shell-border bg-shell-panel-alt px-[14px] py-5">
      <div className={groupHeaderClass}>General</div>
      {ADMINISTRATION_GENERAL_ITEMS.map((item, index) => (
        <div key={item.id} className={index === ADMINISTRATION_GENERAL_ITEMS.length - 1 ? "mb-4" : undefined}>
          <NavRow item={item} is_active={active_section === item.id} onSelect={() => onSelectSection(item.id)} />
        </div>
      ))}

      {ADMINISTRATION_NAV_GROUPS.map((group) => {
        const items = administrationItemsForGroup(group.id);
        const is_expanded = expanded_groups[group.id];
        const is_group_active = group.own_section_id ? active_section === group.own_section_id : false;

        return (
          <div key={group.id}>
            <NavGroupToggle
              label={group.label}
              is_expanded={is_expanded}
              is_active={is_group_active}
              onToggle={() => {
                if (group.own_section_id) onSelectSection(group.own_section_id);
                toggleGroup(group.id);
              }}
            />
            {is_expanded
              ? items.map((item) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    is_active={active_section === item.id}
                    onSelect={() => onSelectSection(item.id)}
                    indent
                  />
                ))
              : null}
          </div>
        );
      })}
    </div>
  );
};

export default AdministrationRail;
