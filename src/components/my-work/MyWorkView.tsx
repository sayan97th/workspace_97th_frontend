"use client";
import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import ToggleSwitch from "@/components/board/toolbar/ToggleSwitch";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { ChevronRightIcon, SearchIcon } from "@/icons/workspace-icons";
import type { MyWorkItemDto, MyWorkStatus } from "@/types/personal";
import { bucketMyWork, type MyWorkBucketKey } from "./myWorkBuckets";
import useMyWork from "./useMyWork";

const HIDE_DONE_STORAGE_KEY = "my_work_hide_done";

/** Accent per section, like monday.com's colored group bars. */
const BUCKET_COLORS: Record<MyWorkBucketKey, string> = {
  past_dates: "#e2445c",
  today: "#00c875",
  this_week: "#579bfc",
  next_week: "#a25ddc",
  later: "#fdab3d",
  no_date: "#c4c4c4",
  done: "#00c875",
};

const readHideDone = (): boolean => {
  try {
    return localStorage.getItem(HIDE_DONE_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
};

/**
 * monday.com's "My Work": everything assigned to the user across every board,
 * in date sections, with the Status and due date editable in place.
 */
const MyWorkView: React.FC = () => {
  const { showToast } = useToast();
  const my_work = useMyWork((message) => showToast({ variant: "error", title: message }));
  const [query, setQuery] = useState("");
  const [hide_done, setHideDone] = useState(readHideDone);
  const [collapsed, setCollapsed] = useState<Set<MyWorkBucketKey>>(new Set());

  const buckets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = (my_work.data?.items ?? []).filter(
      (item) => !normalized || item.name.toLowerCase().includes(normalized) || item.board.label.toLowerCase().includes(normalized)
    );
    return bucketMyWork(items, new Date(), { include_done: !hide_done });
  }, [my_work.data, query, hide_done]);

  const open_count = (my_work.data?.items ?? []).filter((item) => !item.is_done).length;

  const toggleHideDone = () => {
    setHideDone((current) => {
      try {
        localStorage.setItem(HIDE_DONE_STORAGE_KEY, current ? "0" : "1");
      } catch {
        // Only affects whether the choice survives a reload.
      }
      return !current;
    });
  };

  const toggleBucket = (key: MyWorkBucketKey) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (my_work.is_loading) return <BoardLoadingSpinner />;
  if (my_work.error && !my_work.data) return <CenteredMessage title="Something went wrong" detail={my_work.error} />;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.015em] text-shell-text">My work</h1>
          <p className="text-[13.5px] text-shell-text-muted">
            {open_count === 0 ? "Nothing open is assigned to you." : `${open_count} open ${open_count === 1 ? "item" : "items"} assigned to you across all boards.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-[9px] border border-shell-border-strong bg-shell-panel px-3 py-1.5">
            <SearchIcon size={14} className="text-shell-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search items or boards"
              aria-label="Search items or boards"
              className="w-[200px] bg-transparent text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint"
            />
          </label>
          <button type="button" onClick={toggleHideDone} aria-pressed={hide_done} className="flex items-center gap-2 text-[13px] text-shell-text-secondary">
            <ToggleSwitch is_on={hide_done} size="sm" />
            Hide done items
          </button>
        </div>
      </header>

      {buckets.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-20 text-center">
          <h2 className="text-lg font-semibold text-shell-text">{query ? "No matching items" : "You're all caught up"}</h2>
          <p className="text-[13.5px] text-shell-text-muted">
            {query
              ? `Nothing assigned to you matches "${query}".`
              : "Items show up here once someone assigns you in a People column on any board."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {buckets.map((bucket) => {
            const is_collapsed = collapsed.has(bucket.key);
            const color = BUCKET_COLORS[bucket.key];
            return (
              <section key={bucket.key} aria-label={bucket.label}>
                <button
                  type="button"
                  onClick={() => toggleBucket(bucket.key)}
                  aria-expanded={!is_collapsed}
                  className="mb-2 flex items-center gap-2 text-[15px] font-semibold"
                  style={{ color }}
                >
                  <span className={`flex transition-transform duration-150 ${is_collapsed ? "" : "rotate-90"}`}>
                    <ChevronRightIcon size={11} />
                  </span>
                  {bucket.label}
                  <span className="text-[12.5px] font-normal text-shell-text-muted">
                    {bucket.items.length} {bucket.items.length === 1 ? "item" : "items"}
                  </span>
                </button>

                {!is_collapsed && (
                  <div className="overflow-x-auto rounded-lg border border-shell-border bg-shell-panel" style={{ borderLeft: `4px solid ${color}` }}>
                    <table className="w-full min-w-[760px] border-collapse text-[13px]">
                      <thead>
                        <tr className="text-left text-[12px] text-shell-text-muted">
                          <th scope="col" className="border-b border-shell-border px-3 py-2 font-medium">Item</th>
                          <th scope="col" className="w-[220px] border-b border-l border-shell-border px-3 py-2 font-medium">Board</th>
                          <th scope="col" className="w-[150px] border-b border-l border-shell-border px-3 py-2 text-center font-medium">Status</th>
                          <th scope="col" className="w-[150px] border-b border-l border-shell-border px-3 py-2 text-center font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucket.items.map((item) => (
                          <MyWorkRow
                            key={item.id}
                            item={item}
                            status_options={item.status_column_id !== null ? my_work.data?.status_columns[String(item.status_column_id)]?.options ?? [] : []}
                            is_overdue={bucket.key === "past_dates"}
                            onStatusChange={(status) => void my_work.setStatus(item, status)}
                            onDateChange={(date) => void my_work.setDueDate(item, date)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

type MyWorkRowProps = {
  item: MyWorkItemDto;
  status_options: MyWorkStatus[];
  is_overdue: boolean;
  onStatusChange: (status: MyWorkStatus | null) => void;
  onDateChange: (date: string | null) => void;
};

const MyWorkRow: React.FC<MyWorkRowProps> = ({ item, status_options, is_overdue, onStatusChange, onDateChange }) => {
  const status_button_ref = useRef<HTMLButtonElement>(null);
  const [is_status_open, setIsStatusOpen] = useState(false);
  const item_href = `/boards/${item.board.id}/pulses/${item.parent?.id ?? item.id}`;

  return (
    <tr className="group hover:bg-shell-hover">
      <td className="border-b border-shell-border px-3 py-2">
        <Link href={item_href} className="block truncate font-medium text-shell-text hover:text-brand-500">
          {item.name}
        </Link>
        {item.parent && <span className="block truncate text-[11.5px] text-shell-text-faint">Subitem of {item.parent.name}</span>}
      </td>
      <td className="border-b border-l border-shell-border px-3 py-2">
        <Link href={`/boards/${item.board.id}`} className="flex min-w-0 items-center gap-2 text-shell-text-secondary hover:text-shell-text">
          <WorkspaceMonogram workspace={item.board.workspace} size={16} />
          <span className="min-w-0">
            <span className="block truncate">{item.board.label}</span>
            <span className="block truncate text-[11.5px]" style={{ color: item.group.color }}>{item.group.name}</span>
          </span>
        </Link>
      </td>
      <td className="border-b border-l border-shell-border p-1">
        {item.status_column_id === null ? (
          <span className="block text-center text-[12px] text-shell-text-faint">No status</span>
        ) : (
          <>
            <button
              ref={status_button_ref}
              type="button"
              disabled={!item.can_edit}
              onClick={() => setIsStatusOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={is_status_open}
              className="flex h-8 w-full items-center justify-center truncate rounded px-2 text-[12.5px] font-medium text-white disabled:cursor-default"
              style={{ background: item.status?.color ?? "#c4c4c4" }}
            >
              {item.status?.label ?? ""}
            </button>
            <BoardPopover anchor_el={status_button_ref.current} is_open={is_status_open} onClose={() => setIsStatusOpen(false)} width={200}>
              <ul role="listbox" aria-label="Status" className="flex flex-col gap-1 p-2">
                {status_options.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.status?.id === option.id}
                      onClick={() => {
                        onStatusChange(option);
                        setIsStatusOpen(false);
                      }}
                      className="h-8 w-full truncate rounded px-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-85"
                      style={{ background: option.color }}
                    >
                      {option.label || "Blank"}
                    </button>
                  </li>
                ))}
                {item.status && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onStatusChange(null);
                        setIsStatusOpen(false);
                      }}
                      className="h-8 w-full rounded px-2 text-[12.5px] text-shell-text-muted hover:bg-shell-hover"
                    >
                      Clear
                    </button>
                  </li>
                )}
              </ul>
            </BoardPopover>
          </>
        )}
      </td>
      <td className="border-b border-l border-shell-border px-2 py-1 text-center">
        {item.date_column === null ? (
          <span className="text-[12px] text-shell-text-faint">No date column</span>
        ) : (
          <input
            type="date"
            value={item.date?.value ?? ""}
            disabled={!item.can_edit}
            onChange={(event) => onDateChange(event.target.value || null)}
            aria-label={`Due date for ${item.name}`}
            className={`w-full rounded bg-transparent px-1 py-1 text-center text-[12.5px] outline-none focus:bg-shell-bg disabled:cursor-default ${
              is_overdue ? "font-semibold text-error-400" : "text-shell-text"
            }`}
          />
        )}
      </td>
    </tr>
  );
};

export default MyWorkView;
