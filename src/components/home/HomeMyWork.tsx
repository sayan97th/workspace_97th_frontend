import React from "react";
import Link from "next/link";
import { EMPTY_LABEL_COLOR } from "@/components/my-work/myWorkBuckets";
import type { MyWorkItemDto } from "@/types/personal";
import { HOME_WORK_LIMIT, HOME_WORK_TABS, formatDueDate, type HomeWorkSummary, type HomeWorkTab } from "./homeSummary";

type HomeMyWorkProps = {
  /** Null while My work loads. */
  summary: HomeWorkSummary | null;
  active_tab: HomeWorkTab;
  onSelectTab: (tab: HomeWorkTab) => void;
};

const EMPTY_MESSAGES: Record<HomeWorkTab, string> = {
  past_dates: "Nothing overdue. You're right on schedule.",
  today: "Nothing due today. A good moment to plan ahead.",
  this_week: "Nothing else due this week.",
};

/** Subitems open in their parent's drawer, like My work does. */
const itemHref = (item: MyWorkItemDto): string => `/boards/${item.board.id}/pulses/${item.parent?.id ?? item.id}`;

const WorkRow: React.FC<{ item: MyWorkItemDto; is_overdue: boolean }> = ({ item, is_overdue }) => (
  <li>
    <Link href={itemHref(item)} className="home-work-row">
      <span className="home-work-bar" style={{ background: item.group.color || EMPTY_LABEL_COLOR }} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px]">{item.parent ? `${item.parent.name} / ${item.name}` : item.name}</span>
        <span className="block truncate text-[12px] text-[var(--home-text-secondary)]">
          {item.board.label}
          <span aria-hidden="true"> · </span>
          {item.group.name}
        </span>
      </span>
      <span className="home-status-pill" style={{ background: item.status?.color ?? EMPTY_LABEL_COLOR }}>
        {item.status?.label || "No status"}
      </span>
      {item.date && (
        <span className="home-date-pill" data-overdue={is_overdue}>
          {formatDueDate(item.date.value)}
        </span>
      )}
    </Link>
  </li>
);

/** Overdue, Due today and This week tabs with the soonest items of each, linking to the full My work page. */
const HomeMyWork: React.FC<HomeMyWorkProps> = ({ summary, active_tab, onSelectTab }) => {
  const items = summary?.[active_tab] ?? [];
  const hidden_count = Math.max(0, items.length - HOME_WORK_LIMIT);

  return (
    <>
      <div className="home-tabs" role="tablist" aria-label="Due dates">
        {HOME_WORK_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            className="home-tab"
            aria-selected={tab.key === active_tab}
            style={{ "--home-tab-color": tab.color } as React.CSSProperties}
            onClick={() => onSelectTab(tab.key)}
          >
            <span className="home-tab-dot" aria-hidden="true" />
            {tab.label}
            {summary && <span className="home-count">{summary[tab.key].length}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={HOME_WORK_TABS.find((tab) => tab.key === active_tab)?.label}>
        {summary === null ? (
          <div className="flex flex-col gap-2 pt-1">
            {[0, 1, 2].map((index) => (
              <div key={index} className="home-skeleton h-[44px]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="home-empty mt-2">
            <span className="text-[20px]" aria-hidden="true">
              {active_tab === "past_dates" ? "🎯" : active_tab === "today" ? "☕" : "🌤️"}
            </span>
            {EMPTY_MESSAGES[active_tab]}
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.slice(0, HOME_WORK_LIMIT).map((item) => (
              <WorkRow key={item.id} item={item} is_overdue={active_tab === "past_dates"} />
            ))}
          </ul>
        )}
        {hidden_count > 0 && (
          <Link href="/my-work" className="home-full-button">
            View {hidden_count} more in My work
          </Link>
        )}
      </div>
    </>
  );
};

export default HomeMyWork;
