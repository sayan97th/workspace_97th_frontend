"use client";
import React from "react";
import "./board-drawer.css";

export type BoardDrawerTab<TTabId extends string> = {
  id: TTabId;
  label: string;
  icon: React.ReactNode;
  /** Shown as "/ N" after the label when above zero. */
  count?: number;
};

export type BoardDrawerTabsProps<TTabId extends string> = {
  tabs: BoardDrawerTab<TTabId>[];
  active_tab: TTabId;
  onChange: (tab: TTabId) => void;
  aria_label: string;
  /** Prefix for the tab and tab panel ids, unique per drawer so two drawers never share ids. */
  id_prefix: string;
};

/** Id of the panel the tabs control, for the drawer's `role="tabpanel"` element. */
export const drawerTabPanelId = (id_prefix: string) => `${id_prefix}-tabpanel`;

/** Id of one tab, for the panel's `aria-labelledby`. */
export const drawerTabId = (id_prefix: string, tab_id: string) => `${id_prefix}-tab-${tab_id}`;

/** monday style tab row under a board drawer header: icon, label, "/ N" count and an accent underline on the active tab. */
function BoardDrawerTabs<TTabId extends string>({ tabs, active_tab, onChange, aria_label, id_prefix }: BoardDrawerTabsProps<TTabId>) {
  return (
    <div className="board-drawer__tabs" role="tablist" aria-label={aria_label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={drawerTabId(id_prefix, tab.id)}
          type="button"
          role="tab"
          aria-selected={active_tab === tab.id}
          aria-controls={drawerTabPanelId(id_prefix)}
          onClick={() => onChange(tab.id)}
          className="board-drawer__tab"
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && <span className="board-drawer__tab-count">/ {tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export default BoardDrawerTabs;
