import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EMPTY_LABEL_COLOR } from "@/components/my-work/myWorkBuckets";
import type { MyWorkItemDto } from "@/types/personal";
import {
  DEFAULT_UPCOMING_HORIZON,
  HOME_UPCOMING_LIMIT,
  HOME_WORK_LIMIT,
  HOME_WORK_TABS,
  UPCOMING_HORIZONS,
  filterByHorizon,
  formatDueDate,
  formatDueIn,
  formatRangeStart,
  groupUpcoming,
  workRangeOf,
  type HomeWorkSummary,
  type HomeWorkTab,
  type UpcomingHorizon,
} from "./homeSummary";

type HomeMyWorkProps = {
  /** Null while My work loads. */
  summary: HomeWorkSummary | null;
  active_tab: HomeWorkTab;
  onSelectTab: (tab: HomeWorkTab) => void;
  today: Date;
};

const EMPTY_MESSAGES: Record<HomeWorkTab, { icon: string; text: string }> = {
  past_dates: { icon: "🎯", text: "Nothing overdue. You're right on schedule." },
  today: { icon: "☕", text: "Nothing due today. A good moment to plan ahead." },
  this_week: { icon: "🌤️", text: "Nothing else due this week." },
  upcoming: { icon: "🗓️", text: "Nothing planned past this week yet. Items with later due dates show up here." },
};

/** localStorage key of the Upcoming tab's "Due within" pick. */
const HORIZON_STORAGE_KEY = "home_upcoming_horizon";

const isHorizon = (value: unknown): value is UpcomingHorizon => UPCOMING_HORIZONS.some((option) => option.key === value);

/** The Upcoming horizon, remembered per browser. Storage can be blocked, so every access is guarded. */
const useUpcomingHorizon = (): [UpcomingHorizon, (horizon: UpcomingHorizon) => void] => {
  const [horizon, setHorizon] = useState<UpcomingHorizon>(DEFAULT_UPCOMING_HORIZON);

  useEffect(() => {
    try {
      const stored_value = window.localStorage.getItem(HORIZON_STORAGE_KEY);
      if (isHorizon(stored_value)) setHorizon(stored_value);
    } catch {
      // Storage unavailable, keep the default.
    }
  }, []);

  const pickHorizon = (next_horizon: UpcomingHorizon) => {
    setHorizon(next_horizon);
    try {
      window.localStorage.setItem(HORIZON_STORAGE_KEY, next_horizon);
    } catch {
      // Storage unavailable, the pick only lasts for this visit.
    }
  };

  return [horizon, pickHorizon];
};

/** Subitems open in their parent's drawer, like My work does. */
const itemHref = (item: MyWorkItemDto): string => `/boards/${item.board.id}/pulses/${item.parent?.id ?? item.id}`;

type WorkRowProps = {
  item: MyWorkItemDto;
  today: Date;
  is_overdue: boolean;
  /** Adds "Due in 9 days" under the date, for items further out. */
  shows_due_in: boolean;
};

/**
 * One assigned item: name, board and group, status and the due date. Items
 * with a Timeline show their whole range, with a small bar of the time
 * already used while the work is under way.
 */
const WorkRow: React.FC<WorkRowProps> = ({ item, today, is_overdue, shows_due_in }) => {
  const range = workRangeOf(item, today);
  const progress_percent = range ? Math.round(range.progress * 100) : 0;

  return (
    <li>
      <Link href={itemHref(item)} className="home-work-row">
        <span className="home-work-bar" style={{ background: item.group.color || EMPTY_LABEL_COLOR }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px]">{item.parent ? `${item.parent.name} / ${item.name}` : item.name}</span>
          <span className="flex min-w-0 items-center gap-1 text-[12px] text-[var(--home-text-secondary)]">
            <span className="truncate">
              {item.board.label}
              <span aria-hidden="true"> · </span>
              {item.group.name}
            </span>
            {range && range.phase !== "ended" && (
              <span className="home-start-chip" data-phase={range.phase}>
                {formatRangeStart(range, today)}
              </span>
            )}
          </span>
        </span>
        <span className="home-status-pill" style={{ background: item.status?.color ?? EMPTY_LABEL_COLOR }}>
          {item.status?.label || "No status"}
        </span>
        {item.date && (
          <span className="home-date-block">
            <span className="home-date-pill" data-overdue={is_overdue}>
              {range ? (
                <>
                  {formatDueDate(range.start)}
                  <span className="home-date-arrow" aria-label="to">
                    →
                  </span>
                  {formatDueDate(range.end)}
                </>
              ) : (
                formatDueDate(item.date.value)
              )}
            </span>
            {range?.phase === "in_progress" && (
              <span
                className="home-range-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress_percent}
                aria-label={`${progress_percent}% of the timeline has passed`}
                title={`${progress_percent}% of the timeline has passed`}
              >
                <span style={{ width: `${progress_percent}%` }} />
              </span>
            )}
            {shows_due_in && <span className="home-due-in">Due {formatDueIn(item.date.value, today)}</span>}
          </span>
        )}
      </Link>
    </li>
  );
};

const EmptyState: React.FC<{ icon: string; children: React.ReactNode }> = ({ icon, children }) => (
  <p className="home-empty mt-2">
    <span className="text-[20px]" aria-hidden="true">
      {icon}
    </span>
    <span>{children}</span>
  </p>
);

/**
 * Everything due after this week, grouped as Next week, the rest of this
 * month and then month by month, with a "Due within" filter so the list can
 * stay short or show the whole road ahead.
 */
const UpcomingPanel: React.FC<{ items: MyWorkItemDto[]; today: Date }> = ({ items, today }) => {
  const [horizon, setHorizon] = useUpcomingHorizon();
  const [is_expanded, setIsExpanded] = useState(false);

  const visible_items = useMemo(() => filterByHorizon(items, horizon, today), [items, horizon, today]);
  const shown_items = useMemo(
    () => (is_expanded ? visible_items : visible_items.slice(0, HOME_UPCOMING_LIMIT)),
    [visible_items, is_expanded]
  );
  const groups = useMemo(() => groupUpcoming(shown_items, today), [shown_items, today]);
  const hidden_count = visible_items.length - shown_items.length;
  const further_count = items.length - visible_items.length;
  const horizon_option = UPCOMING_HORIZONS.find((option) => option.key === horizon);

  const pickHorizon = (next_horizon: UpcomingHorizon) => {
    setHorizon(next_horizon);
    setIsExpanded(false);
  };

  if (items.length === 0) return <EmptyState icon={EMPTY_MESSAGES.upcoming.icon}>{EMPTY_MESSAGES.upcoming.text}</EmptyState>;

  return (
    <>
      <div className="home-upcoming-toolbar">
        <span className="text-[13px] text-[var(--home-text-secondary)]" id="home-upcoming-horizon-label">
          Due within
        </span>
        <div className="home-segmented" role="radiogroup" aria-labelledby="home-upcoming-horizon-label">
          {UPCOMING_HORIZONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={option.key === horizon}
              title={option.title}
              className="home-segment"
              onClick={() => pickHorizon(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {further_count > 0 && visible_items.length > 0 && (
          <span className="home-upcoming-meta">
            {visible_items.length} of {items.length} items
          </span>
        )}
      </div>

      {visible_items.length === 0 ? (
        <EmptyState icon="🔭">
          Nothing due in the next {horizon_option?.label ?? "few days"}. {further_count} {further_count === 1 ? "item is" : "items are"} planned further out.{" "}
          <button type="button" className="home-link" onClick={() => pickHorizon("all")}>
            Show all upcoming
          </button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`home-upcoming-${group.key}`}>
              <h3 className="home-upcoming-heading" id={`home-upcoming-${group.key}`}>
                <span>{group.label}</span>
                {group.hint && <span className="home-upcoming-hint">{group.hint}</span>}
                <span className="home-count">{group.items.length}</span>
              </h3>
              <ul className="flex flex-col">
                {group.items.map((item) => (
                  <WorkRow key={item.id} item={item} today={today} is_overdue={false} shows_due_in />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {(hidden_count > 0 || is_expanded) && visible_items.length > HOME_UPCOMING_LIMIT && (
        <button type="button" className="home-full-button" aria-expanded={is_expanded} onClick={() => setIsExpanded((current) => !current)}>
          {is_expanded ? "Show less" : `Show ${hidden_count} more`}
        </button>
      )}
    </>
  );
};

/**
 * Overdue, Due today, This week and Upcoming tabs. The first three list the
 * soonest items and link to the full My work page, Upcoming looks further
 * ahead so longer work can be planned early.
 */
const HomeMyWork: React.FC<HomeMyWorkProps> = ({ summary, active_tab, onSelectTab, today }) => {
  const items = summary?.[active_tab] ?? [];
  const hidden_count = Math.max(0, items.length - HOME_WORK_LIMIT);
  const empty_message = EMPTY_MESSAGES[active_tab];
  const tablist_ref = useRef<HTMLDivElement>(null);

  // On narrow screens the tabs scroll sideways, keep the selected one in view.
  // Only the strip scrolls, never the page.
  useEffect(() => {
    const tablist = tablist_ref.current;
    const selected_tab = tablist?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!tablist || !selected_tab) return;
    const tab_start = selected_tab.getBoundingClientRect().left - tablist.getBoundingClientRect().left + tablist.scrollLeft;
    const tab_end = tab_start + selected_tab.offsetWidth;
    if (tab_start < tablist.scrollLeft) tablist.scrollLeft = tab_start;
    else if (tab_end > tablist.scrollLeft + tablist.clientWidth) tablist.scrollLeft = tab_end - tablist.clientWidth;
  }, [active_tab]);

  return (
    <>
      <div ref={tablist_ref} className="home-tabs" role="tablist" aria-label="Due dates">
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
        ) : active_tab === "upcoming" ? (
          <UpcomingPanel items={items} today={today} />
        ) : items.length === 0 ? (
          <EmptyState icon={empty_message.icon}>{empty_message.text}</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {items.slice(0, HOME_WORK_LIMIT).map((item) => (
              <WorkRow key={item.id} item={item} today={today} is_overdue={active_tab === "past_dates"} shows_due_in={false} />
            ))}
          </ul>
        )}
        {active_tab !== "upcoming" && hidden_count > 0 && (
          <Link href="/my-work" className="home-full-button">
            View {hidden_count} more in My work
          </Link>
        )}
      </div>
    </>
  );
};

export default HomeMyWork;
