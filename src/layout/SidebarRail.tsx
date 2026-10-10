"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClockIcon, FeedSettingsIcon, HomeIcon, MoreDotsIcon, StarIcon, WorkspaceRailIcon } from "@/icons/workspace-icons";
import { AutomateIcon, CalendarViewIcon } from "@/icons/board-icons";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { useSidebar } from "@/context/SidebarContext";
import SidebarCustomizePanel from "./SidebarCustomizePanel";
import { SIDEBAR_SECTION_LABELS, isPathActive, type SidebarPanelView } from "./sidebarConstants";
import type { SidebarSectionKey } from "@/types/auth";

const RAIL_ICON_SIZE = 20;

type RailTarget = { kind: "link"; href: string } | { kind: "panel"; view: SidebarPanelView };

type RailEntry = {
  label: string;
  icon: React.ReactNode;
  target: RailTarget;
};

/** What every personal section does once picked: open a page, or switch the panel next to the rail. */
const SECTION_ENTRIES: Record<SidebarSectionKey, RailEntry> = {
  home: { label: SIDEBAR_SECTION_LABELS.home, icon: <HomeIcon size={RAIL_ICON_SIZE} />, target: { kind: "link", href: "/workspace-home" } },
  my_work: { label: SIDEBAR_SECTION_LABELS.my_work, icon: <CalendarViewIcon size={RAIL_ICON_SIZE} />, target: { kind: "link", href: "/my-work" } },
  favorites: { label: SIDEBAR_SECTION_LABELS.favorites, icon: <StarIcon size={RAIL_ICON_SIZE} />, target: { kind: "panel", view: "favorites" } },
  automations: { label: SIDEBAR_SECTION_LABELS.automations, icon: <AutomateIcon size={RAIL_ICON_SIZE} />, target: { kind: "link", href: "/automations" } },
  recent: { label: SIDEBAR_SECTION_LABELS.recent, icon: <ClockIcon size={RAIL_ICON_SIZE} />, target: { kind: "panel", view: "recent" } },
};

const WORKSPACE_ENTRY: RailEntry = { label: "Workspace", icon: <WorkspaceRailIcon size={RAIL_ICON_SIZE} />, target: { kind: "panel", view: "workspace" } };

const RAIL_ITEM_CLASS =
  "group/rail flex w-[70px] flex-col items-center gap-1 rounded-lg py-1 text-sidebar-text outline-none focus-visible:ring-2 focus-visible:ring-sidebar-focus";

const railIconBoxClass = (is_active: boolean) =>
  `flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
    is_active ? "bg-sidebar-active text-sidebar-text" : "text-sidebar-text-secondary group-hover/rail:bg-sidebar-hover group-hover/rail:text-sidebar-text"
  }`;

const RailLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-full truncate text-center text-[12px] leading-4 tracking-[-0.01em]">{children}</span>
);

const RailDivider: React.FC = () => <div role="separator" className="mx-auto my-2 h-px w-9 flex-none bg-sidebar-divider" />;

export type SidebarRailProps = {
  panel_view: SidebarPanelView;
  /** True while the panel next to the rail is showing, pinned open or peeking. */
  is_panel_open: boolean;
  /** Fired when a panel entry (Workspace, Favorites, Recent) is clicked, `is_active` tells whether it was the highlighted one. */
  onSelectPanelView: (view: SidebarPanelView, is_active: boolean) => void;
  /** Fired when the pointer rests on a panel entry, so a collapsed panel can peek in with that view. */
  onHoverPanelView: (view: SidebarPanelView) => void;
  onMouseLeave: () => void;
};

/**
 * First level of the two level sidebar, modeled on monday.com's app rail:
 * Workspace, then the personal sections the user keeps visible (Home, My work,
 * Favorites, Automations by default), then "More" with the hidden ones and
 * the Customize sidebar switches. Always visible on desktop, the panel next to
 * it is what collapses.
 */
const SidebarRail: React.FC<SidebarRailProps> = ({ panel_view, is_panel_open, onSelectPanelView, onHoverPanelView, onMouseLeave }) => {
  const pathname = usePathname() ?? "";
  const { sidebar_preferences, updateSidebarSections } = useSidebar();
  const [more_anchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [customize_anchor, setCustomizeAnchor] = useState<HTMLElement | null>(null);

  const visible_entries = sidebar_preferences.sections.filter((section) => section.is_visible).map((section) => SECTION_ENTRIES[section.key]);
  const hidden_entries = sidebar_preferences.sections.filter((section) => !section.is_visible).map((section) => SECTION_ENTRIES[section.key]);

  // One highlight at a time: the page the user is on wins over the panel's current list.
  const active_link = [...visible_entries, ...hidden_entries].find((entry) => entry.target.kind === "link" && isPathActive(pathname, entry.target.href));

  const isEntryActive = (entry: RailEntry): boolean => {
    if (entry.target.kind === "link") return entry === active_link;
    return !active_link && is_panel_open && panel_view === entry.target.view;
  };

  const closeMore = () => setMoreAnchor(null);

  const renderEntry = (entry: RailEntry) => {
    const is_active = isEntryActive(entry);
    const content = (
      <>
        <span className={railIconBoxClass(is_active)}>{entry.icon}</span>
        <RailLabel>{entry.label}</RailLabel>
      </>
    );

    if (entry.target.kind === "link") {
      return (
        <Link key={entry.label} href={entry.target.href} className={RAIL_ITEM_CLASS} aria-current={is_active ? "page" : undefined} title={entry.label}>
          {content}
        </Link>
      );
    }

    const view = entry.target.view;
    return (
      <button
        key={entry.label}
        type="button"
        onClick={() => onSelectPanelView(view, is_active)}
        onMouseEnter={() => onHoverPanelView(view)}
        className={RAIL_ITEM_CLASS}
        aria-pressed={is_active}
        title={entry.label}
      >
        {content}
      </button>
    );
  };

  const renderMoreRow = (entry: RailEntry) => {
    const row_class = "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-sidebar-text transition-colors hover:bg-sidebar-hover";
    const icon = <span className="flex flex-none text-sidebar-text-secondary [&_svg]:h-4 [&_svg]:w-4">{entry.icon}</span>;
    if (entry.target.kind === "link") {
      return (
        <Link key={entry.label} href={entry.target.href} onClick={closeMore} className={row_class}>
          {icon}
          {entry.label}
        </Link>
      );
    }
    const view = entry.target.view;
    return (
      <button
        key={entry.label}
        type="button"
        onClick={() => {
          closeMore();
          onSelectPanelView(view, false);
        }}
        className={row_class}
      >
        {icon}
        {entry.label}
      </button>
    );
  };

  return (
    <nav
      aria-label="App navigation"
      onMouseLeave={onMouseLeave}
      className="shell-scrollbar flex h-full w-[72px] flex-none flex-col items-center overflow-y-auto overflow-x-hidden bg-sidebar-rail pb-3 pt-2"
    >
      {renderEntry(WORKSPACE_ENTRY)}
      {visible_entries.length > 0 && <RailDivider />}
      <div className="flex flex-col items-center gap-2">{visible_entries.map(renderEntry)}</div>
      <RailDivider />

      <button
        type="button"
        onClick={(event) => setMoreAnchor(more_anchor ? null : event.currentTarget)}
        className={RAIL_ITEM_CLASS}
        aria-haspopup="menu"
        aria-expanded={more_anchor !== null}
        title="More"
      >
        <span className={railIconBoxClass(more_anchor !== null || customize_anchor !== null)}>
          <MoreDotsIcon size={RAIL_ICON_SIZE} />
        </span>
        <RailLabel>More</RailLabel>
      </button>

      <BoardPopover anchor_el={more_anchor} is_open={more_anchor !== null} onClose={closeMore} width={220} align="start">
        <div className="flex flex-col p-1.5" role="menu" aria-label="More">
          {hidden_entries.map(renderMoreRow)}
          {hidden_entries.length > 0 && <div className="mx-1 my-1 h-px bg-sidebar-border" />}
          <button
            type="button"
            onClick={() => {
              setCustomizeAnchor(more_anchor);
              closeMore();
            }}
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-sidebar-text transition-colors hover:bg-sidebar-hover"
          >
            <span className="flex flex-none text-sidebar-text-secondary">
              <FeedSettingsIcon size={16} />
            </span>
            Customize sidebar
          </button>
        </div>
      </BoardPopover>

      <SidebarCustomizePanel
        anchor_el={customize_anchor}
        is_open={customize_anchor !== null}
        onClose={() => setCustomizeAnchor(null)}
        sections={sidebar_preferences.sections}
        onChange={updateSidebarSections}
      />
    </nav>
  );
};

export default SidebarRail;
