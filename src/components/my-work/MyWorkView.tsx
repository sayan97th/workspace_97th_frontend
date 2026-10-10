"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { boardTreeFontClassName } from "@/components/board/board-tree-font";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import ToggleSwitch from "@/components/board/toolbar/ToggleSwitch";
import { useToast } from "@/components/ui/toast/ToastProvider";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { CheckIcon, ChevronDownIcon, InfoIcon, SearchIcon } from "@/icons/workspace-icons";
import type { CreateMyWorkItemPayload } from "@/types/personal";
import "./my-work.css";
import MyWorkCalendar from "./MyWorkCalendar";
import { groupMyWork, MY_WORK_GROUP_BY_LABELS, toDateKey, type MyWorkGroupBy, type MyWorkSortKey } from "./myWorkBuckets";
import { SlidersIcon } from "./myWorkIcons";
import MyWorkNewItemPopover, { type MyWorkNewItemTarget } from "./MyWorkNewItemPopover";
import {
  DEFAULT_MY_WORK_PREFERENCES,
  minimumRowWidth,
  MY_WORK_COLUMNS,
  readMyWorkPreferences,
  writeMyWorkPreferences,
  type MyWorkColumnKey,
  type MyWorkPreferences,
  type MyWorkTab,
} from "./myWorkPreferences";
import MyWorkSection from "./MyWorkSection";
import useMyWork from "./useMyWork";

const TABS: { key: MyWorkTab; label: string }[] = [
  { key: "table", label: "Table" },
  { key: "calendar", label: "Calendar" },
];

const GROUP_BY_OPTIONS: MyWorkGroupBy[] = ["date", "board", "status"];

/**
 * monday.com's "My Work": everything assigned to the user across every board,
 * in Table or Calendar form. The table splits items into date sections (or
 * by board or status), with Status, Priority and the due date editable in
 * place, and new items can be created straight into a section.
 */
const MyWorkView: React.FC = () => {
  const { showToast } = useToast();
  const showError = useCallback((message: string) => showToast({ variant: "error", title: message }), [showToast]);
  const my_work = useMyWork(showError);

  const [preferences, setPreferences] = useState<MyWorkPreferences>(DEFAULT_MY_WORK_PREFERENCES);
  const [query, setQuery] = useState("");
  // Sections the user folded or opened by hand. Without an entry an empty section starts folded.
  const [collapsed_overrides, setCollapsedOverrides] = useState<Record<string, boolean>>({});
  const [new_item_target, setNewItemTarget] = useState<MyWorkNewItemTarget | null>(null);
  const [is_customize_open, setIsCustomizeOpen] = useState(false);
  const [is_group_by_open, setIsGroupByOpen] = useState(false);
  const customize_ref = useRef<HTMLButtonElement>(null);
  const group_by_ref = useRef<HTMLButtonElement>(null);

  // Saved layout is read after mount so the server render and the first client render match.
  useEffect(() => setPreferences(readMyWorkPreferences()), []);

  const updatePreferences = useCallback((patch: Partial<MyWorkPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      writeMyWorkPreferences(next);
      return next;
    });
  }, []);

  const today = useMemo(() => new Date(), []);
  const today_key = toDateKey(today);

  const visible_items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (my_work.data?.items ?? []).filter((item) => {
      if (preferences.hide_done && item.is_done) return false;
      if (!normalized) return true;
      return [item.name, item.board.label, item.group.name].some((text) => text.toLowerCase().includes(normalized));
    });
  }, [my_work.data, query, preferences.hide_done]);

  const sections = useMemo(
    () => groupMyWork(visible_items, preferences.group_by, today, preferences.sort),
    [visible_items, preferences.group_by, preferences.sort, today]
  );

  const columns = useMemo(() => MY_WORK_COLUMNS.filter((column) => !preferences.hidden_columns.includes(column.key)), [preferences.hidden_columns]);

  const toggleSection = (key: string, is_collapsed: boolean) => setCollapsedOverrides((current) => ({ ...current, [key]: !is_collapsed }));

  const sortBy = (key: MyWorkSortKey) =>
    updatePreferences({
      sort: preferences.sort.key === key ? { key, direction: preferences.sort.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" },
    });

  const toggleColumn = (key: MyWorkColumnKey) =>
    updatePreferences({
      hidden_columns: preferences.hidden_columns.includes(key)
        ? preferences.hidden_columns.filter((hidden) => hidden !== key)
        : [...preferences.hidden_columns, key],
    });

  const copyLink = async (href: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`);
      showToast({ variant: "success", title: "Item link copied" });
    } catch {
      showError("We couldn't copy the link.");
    }
  };

  const createItem = async (payload: CreateMyWorkItemPayload): Promise<boolean> => {
    const created = await my_work.createItem(payload);
    if (!created) return false;

    updatePreferences({ last_board_id: payload.board_id });
    showToast(
      created.is_assigned
        ? { variant: "success", title: `"${created.item.name}" was added to your work` }
        : { variant: "warning", title: "Item created, but that board has no People column to assign you in, so it won't show up here." }
    );
    return true;
  };

  if (my_work.is_loading) return <BoardLoadingSpinner />;
  if (my_work.error && !my_work.data) return <CenteredMessage title="Something went wrong" detail={my_work.error} />;

  const has_any_item = (my_work.data?.items.length ?? 0) > 0;
  const min_row_width = minimumRowWidth(columns);

  return (
    <div className={`my-work-theme flex min-h-full flex-col ${boardTreeFontClassName}`}>
      <header className="px-6 pt-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-[32px] leading-10 font-medium tracking-[-0.5px]">My Work</h1>
            <Tooltip content="Every item you're assigned to in a People column, across all your boards." placement="bottom">
              <span tabIndex={0} aria-label="About My Work" className="flex h-7 w-7 items-center justify-center rounded text-[var(--mw-text)] hover:bg-[var(--mw-hover)]">
                <InfoIcon size={18} />
              </span>
            </Tooltip>
          </div>

          <button
            ref={customize_ref}
            type="button"
            onClick={() => setIsCustomizeOpen((open) => !open)}
            aria-haspopup="dialog"
            aria-expanded={is_customize_open}
            className="my-work-ghost-button mt-1 text-board-nav"
          >
            <SlidersIcon size={18} />
            Customize
          </button>
          <BoardPopover anchor_el={customize_ref.current} is_open={is_customize_open} onClose={() => setIsCustomizeOpen(false)} width={260}>
            <div role="dialog" aria-label="Customize My Work" className="my-work-theme flex flex-col gap-1 rounded-lg p-3 text-board-cell">
              <p className="px-1 pb-1 text-board-caption font-semibold text-[var(--mw-text-secondary)]">Columns</p>
              {MY_WORK_COLUMNS.map((column) => {
                const is_shown = !preferences.hidden_columns.includes(column.key);
                return (
                  <button
                    key={column.key}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={is_shown}
                    onClick={() => toggleColumn(column.key)}
                    className="flex h-8 items-center justify-between rounded px-1 hover:bg-[var(--mw-hover)]"
                  >
                    {column.label}
                    <ToggleSwitch is_on={is_shown} size="sm" />
                  </button>
                );
              })}
              <div className="my-1 border-t border-[var(--mw-border-soft)]" />
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={preferences.hide_done}
                onClick={() => updatePreferences({ hide_done: !preferences.hide_done })}
                className="flex h-8 items-center justify-between rounded px-1 hover:bg-[var(--mw-hover)]"
              >
                Hide done items
                <ToggleSwitch is_on={preferences.hide_done} size="sm" />
              </button>
            </div>
          </BoardPopover>
        </div>

        <div role="tablist" aria-label="My Work views" className="mt-4 flex text-board-nav">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={preferences.tab === tab.key}
              onClick={() => updatePreferences({ tab: tab.key })}
              className="my-work-tab"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col border-t border-[var(--mw-border-soft)]">
        <div className="flex flex-wrap items-center gap-4 px-6 py-2 sm:px-8">
          <button
            type="button"
            onClick={(event) => setNewItemTarget({ anchor_el: event.currentTarget, date: null, board_id: null })}
            className="my-work-primary-button text-board-nav"
          >
            New item
          </button>
          <label className="my-work-search text-board-nav">
            <SearchIcon size={15} className="flex-none text-[var(--mw-text-secondary)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search your items"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--mw-text-secondary)]"
            />
          </label>

          {preferences.tab === "table" && (
            <>
              <button
                ref={group_by_ref}
                type="button"
                onClick={() => setIsGroupByOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={is_group_by_open}
                className="my-work-soft-button ml-auto text-board-cell"
              >
                {MY_WORK_GROUP_BY_LABELS[preferences.group_by]}
                <ChevronDownIcon size={12} />
              </button>
              <BoardPopover anchor_el={group_by_ref.current} is_open={is_group_by_open} onClose={() => setIsGroupByOpen(false)} width={180}>
                <ul role="listbox" aria-label="Group items by" className="my-work-theme flex flex-col rounded-lg p-1.5 text-board-cell">
                  {GROUP_BY_OPTIONS.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={preferences.group_by === option}
                        onClick={() => {
                          updatePreferences({ group_by: option });
                          setCollapsedOverrides({});
                          setIsGroupByOpen(false);
                        }}
                        className="flex h-8 w-full items-center justify-between rounded px-2 text-left hover:bg-[var(--mw-hover)]"
                      >
                        {MY_WORK_GROUP_BY_LABELS[option]}
                        {preferences.group_by === option && <CheckIcon size={14} className="text-[var(--mw-accent)]" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </BoardPopover>
            </>
          )}
        </div>

        {preferences.tab === "calendar" ? (
          <div className="px-6 sm:px-8">
            <MyWorkCalendar items={visible_items} />
          </div>
        ) : (
          <div className="my-work-scroll flex-1 overflow-x-auto pb-6">
            {/* Left padding leaves room for each row's "..." menu, which hangs outside the colored bar. */}
            <div className="flex flex-col gap-8 pt-2 pr-6 pl-10 sm:pl-12" style={{ minWidth: min_row_width + 80 }}>
              {sections.map((section) => {
                const is_collapsed = collapsed_overrides[section.key] ?? section.items.length === 0;
                return (
                  <MyWorkSection
                    key={section.key}
                    section={section}
                    columns={columns}
                    status_columns={my_work.data?.status_columns ?? {}}
                    is_collapsed={is_collapsed}
                    sort={preferences.sort}
                    today_key={today_key}
                    onToggle={() => toggleSection(section.key, is_collapsed)}
                    onSort={sortBy}
                    onAddItem={(anchor_el) => setNewItemTarget({ anchor_el, date: section.new_item_date, board_id: section.new_item_board_id })}
                    onStatusChange={(item, status) => void my_work.setStatus(item, status)}
                    onPriorityChange={(item, priority) => void my_work.setPriority(item, priority)}
                    onDateChange={(item, date) => void my_work.setDueDate(item, date)}
                    onCopyLink={(href) => void copyLink(href)}
                  />
                );
              })}

              {!has_any_item ? (
                <EmptyState title="You're all caught up" detail="Items show up here once someone assigns you in a People column on any board." />
              ) : (
                visible_items.length === 0 &&
                query && <EmptyState title="No matching items" detail={`Nothing assigned to you matches "${query}".`} />
              )}
            </div>
          </div>
        )}
      </div>

      <MyWorkNewItemPopover
        target={new_item_target}
        last_board_id={preferences.last_board_id}
        onClose={() => setNewItemTarget(null)}
        onCreate={createItem}
      />
    </div>
  );
};

const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="flex max-w-md flex-col gap-1 py-6">
    <h2 className="text-board-nav font-semibold">{title}</h2>
    <p className="text-board-cell text-[var(--mw-text-secondary)]">{detail}</p>
  </div>
);

export default MyWorkView;
