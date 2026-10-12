"use client";
import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ADMINISTRATION_NAV,
  administrationGroupForSection,
  canSeeAdministrationItem,
  type AdministrationNavItem,
} from "./administrationNavConfig";
import type { AdminNavGroupId, AdminSectionId } from "./types";

export type AdministrationRailProps = {
  active_section: AdminSectionId;
  onSelectSection: (id: AdminSectionId) => void;
};

type NavRowProps = {
  item: AdministrationNavItem;
  is_active: boolean;
  onSelect: (id: AdminSectionId) => void;
  icon?: React.ReactNode;
  is_child?: boolean;
};

/** One rail page, every page opens inside the Administration view. */
const NavRow: React.FC<NavRowProps> = ({ item, is_active, onSelect, icon, is_child = false }) => {
  const class_name = `admin-rail-row${is_child ? " admin-rail-child" : ""}`;
  const content = (
    <>
      {icon ? <span className="admin-rail-icon">{icon}</span> : null}
      <span className="admin-rail-label">{item.label}</span>
    </>
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={is_active ? "page" : undefined}
      className={class_name}
    >
      {content}
    </button>
  );
};

/**
 * Left rail of the Administration view, monday.com style: collapsible groups with an icon and
 * a chevron, child pages indented below them, and top level pages after the groups. Driven
 * entirely by `administrationNavConfig`. Only the group holding the active page starts open,
 * the others open and close on click and stay that way while the view is mounted.
 */
const AdministrationRail: React.FC<AdministrationRailProps> = ({ active_section, onSelectSection }) => {
  const { hasAnyRole } = useAuth();
  const [expanded_groups, setExpandedGroups] = useState<Partial<Record<AdminNavGroupId, boolean>>>(() => {
    const group = administrationGroupForSection(active_section);
    return group ? { [group]: true } : {};
  });

  // Opening a page from a deep link or a section's own link reveals its group.
  useEffect(() => {
    const group = administrationGroupForSection(active_section);
    if (!group) return;
    setExpandedGroups((current) => (current[group] ? current : { ...current, [group]: true }));
  }, [active_section]);

  const toggleGroup = (id: AdminNavGroupId) => setExpandedGroups((current) => ({ ...current, [id]: !current[id] }));

  return (
    <nav aria-label="Administration" className="admin-rail scrollnice">
      {ADMINISTRATION_NAV.map((node) => {
        const Icon = node.icon;

        if (node.kind === "page") {
          if (!canSeeAdministrationItem(node.item, hasAnyRole)) return null;
          return (
            <NavRow
              key={node.item.id}
              item={node.item}
              is_active={active_section === node.item.id}
              onSelect={onSelectSection}
              icon={<Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
            />
          );
        }

        const items = node.items.filter((item) => canSeeAdministrationItem(item, hasAnyRole));
        if (items.length === 0) return null;
        const is_expanded = Boolean(expanded_groups[node.id]);
        const list_id = `admin-rail-group-${node.id}`;

        return (
          <div key={node.id} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => toggleGroup(node.id)}
              aria-expanded={is_expanded}
              aria-controls={list_id}
              className="admin-rail-row"
            >
              <span className="admin-rail-icon">
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="admin-rail-label">{node.label}</span>
              <span className="admin-rail-chevron">
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
            </button>
            {is_expanded ? (
              <div id={list_id} className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    is_active={active_section === item.id}
                    onSelect={onSelectSection}
                    is_child
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
};

export default AdministrationRail;
