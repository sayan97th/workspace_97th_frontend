import React from "react";
import { BellIcon, ClockIcon, SunIcon } from "@/icons/workspace-icons";
import { CalendarViewIcon } from "@/icons/board-icons";
import type { HomeWorkTab } from "./homeSummary";

type HomeStatTilesProps = {
  /** Null while My work loads. */
  counts: Record<HomeWorkTab, number> | null;
  /** Null while the inbox loads. */
  unread: number | null;
  onSelectTab: (tab: HomeWorkTab) => void;
  onOpenInbox: () => void;
};

type StatTile = {
  key: string;
  label: string;
  color: string;
  value: number | null;
  Icon: React.FC<{ size?: number; className?: string }>;
  onClick: () => void;
};

/** Four big numbers under the hero: overdue, due today, this week and unread notifications in the inbox. */
const HomeStatTiles: React.FC<HomeStatTilesProps> = ({ counts, unread, onSelectTab, onOpenInbox }) => {
  const tiles: StatTile[] = [
    { key: "past_dates", label: "Overdue", color: "#e2445c", value: counts?.past_dates ?? null, Icon: ClockIcon, onClick: () => onSelectTab("past_dates") },
    { key: "today", label: "Due today", color: "#00c875", value: counts?.today ?? null, Icon: SunIcon, onClick: () => onSelectTab("today") },
    { key: "this_week", label: "This week", color: "#579bfc", value: counts?.this_week ?? null, Icon: CalendarViewIcon, onClick: () => onSelectTab("this_week") },
    { key: "unread", label: "Unread", color: "#a25ddc", value: unread, Icon: BellIcon, onClick: onOpenInbox },
  ];

  return (
    <div className="home-stats">
      {tiles.map((tile, index) => (
        <button
          key={tile.key}
          type="button"
          className="home-stat home-rise"
          style={{ "--home-stat-color": tile.color, "--home-delay": `${60 + index * 50}ms` } as React.CSSProperties}
          onClick={tile.onClick}
        >
          <span className="home-stat-icon">
            <tile.Icon size={19} />
          </span>
          <span className="min-w-0">
            <span className="home-stat-value block">{tile.value === null ? "-" : tile.value}</span>
            <span className="home-stat-label block truncate">{tile.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default HomeStatTiles;
