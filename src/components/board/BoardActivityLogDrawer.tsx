"use client";
import React, { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import BoardDrawerHeader from "./drawer/BoardDrawerHeader";
import SlideOverPanel from "./drawer/SlideOverPanel";
import ActivityLogActivityTab from "./activity-log/ActivityLogActivityTab";
import ActivityLogLastViewedTab from "./activity-log/ActivityLogLastViewedTab";
import ActivityLogUpdatesTab from "./activity-log/ActivityLogUpdatesTab";
import { useAuth } from "@/context/AuthContext";
import "./activity-log/board-activity-log.scss";

export type BoardActivityLogDrawerProps = {
  board_id: number;
  /** Shown as "{board} Log" in the header, like monday.com. */
  board_name?: string;
  is_open: boolean;
  onClose: () => void;
};

type ActivityLogTab = "activity" | "last_viewed" | "updates";

const TABS: Array<{ key: ActivityLogTab; label: string }> = [
  { key: "activity", label: "Activity" },
  { key: "last_viewed", label: "Last viewed" },
  { key: "updates", label: "Updates" },
];

/**
 * The board's Activity log, monday.com style: a wide slide over with three
 * tabs. "Activity" lists every change made on the board (cell values, items,
 * groups, columns and board settings) with filters and Undo, "Last viewed"
 * lists who opened the board, and "Updates" lists the updates posted on its
 * items. A tab loads the first time it is opened and keeps its state (filters
 * included) while the drawer stays open.
 */
const BoardActivityLogDrawer: React.FC<BoardActivityLogDrawerProps> = ({ board_id, board_name, is_open, onClose }) => {
  const router = useRouter();
  const { user } = useAuth();
  const tabs_id = useId();
  const [active_tab, setActiveTab] = useState<ActivityLogTab>("activity");
  const [visited_tabs, setVisitedTabs] = useState<Set<ActivityLogTab>>(() => new Set(["activity"]));

  // Every opening starts fresh on the Activity tab.
  useEffect(() => {
    if (is_open) return;
    setActiveTab("activity");
    setVisitedTabs(new Set(["activity"]));
  }, [is_open]);

  const selectTab = (tab: ActivityLogTab) => {
    setActiveTab(tab);
    setVisitedTabs((current) => (current.has(tab) ? current : new Set([...current, tab])));
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.key === active_tab);
    const next = TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    selectTab(next.key);
    document.getElementById(`${tabs_id}-${next.key}-tab`)?.focus();
  };

  // Opens the item drawer through the board's `/pulses/{id}` URL, keeping the active view.
  const openItem = (item_id: number) => {
    const view_id = new URLSearchParams(window.location.search).get("view_id");
    onClose();
    router.push(`/boards/${board_id}/pulses/${item_id}${view_id ? `?view_id=${view_id}` : ""}`);
  };

  const current_user_id = user?.id ?? null;
  const display_name = board_name?.trim() || "Board";

  return (
    <SlideOverPanel is_open={is_open} onClose={onClose} aria_label={`${display_name} log`} panel_class_name="activity-log w-[min(920px,100vw)]">
      <BoardDrawerHeader
        title={
          <span className="activity-log__title">
            <span className="activity-log__title-board">{display_name}</span>
            <span className="activity-log__title-suffix">Log</span>
          </span>
        }
        onClose={onClose}
        close_label="Close activity log"
      />

      <div className="activity-log__tabs" role="tablist" aria-label="Activity log sections" onKeyDown={handleTabKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            id={`${tabs_id}-${tab.key}-tab`}
            type="button"
            role="tab"
            aria-selected={active_tab === tab.key}
            aria-controls={`${tabs_id}-${tab.key}-panel`}
            tabIndex={active_tab === tab.key ? 0 : -1}
            className="activity-log__tab"
            onClick={() => selectTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {is_open &&
        TABS.filter((tab) => visited_tabs.has(tab.key)).map((tab) => (
          <div
            key={tab.key}
            id={`${tabs_id}-${tab.key}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabs_id}-${tab.key}-tab`}
            hidden={active_tab !== tab.key}
            className="activity-log__panel"
          >
            {tab.key === "activity" && <ActivityLogActivityTab board_id={board_id} board_name={display_name} current_user_id={current_user_id} onOpenItem={openItem} />}
            {tab.key === "last_viewed" && <ActivityLogLastViewedTab board_id={board_id} current_user_id={current_user_id} />}
            {tab.key === "updates" && <ActivityLogUpdatesTab board_id={board_id} onOpenItem={openItem} />}
          </div>
        ))}
    </SlideOverPanel>
  );
};

export default BoardActivityLogDrawer;
