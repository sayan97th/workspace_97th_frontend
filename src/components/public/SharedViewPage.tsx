"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicApiError } from "@/lib/public-api-client";
import { boardShareService } from "@/services/board-share.service";
import type { SharedViewColumnDto, SharedViewDto } from "@/types/board-sharing";

type PageState = "loading" | "password" | "ready" | "unavailable";

const formatDate = (value: string): string => {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const isSafeUrl = (url: string): boolean => /^https?:\/\//i.test(url);

/**
 * Renders one cell of a shared view. Only reads the value, never offers an
 * edit, and never renders raw HTML.
 */
const SharedCell: React.FC<{ column: SharedViewColumnDto; value: unknown; people: SharedViewDto["people"] }> = ({ column, value, people }) => {
  if (value === null || value === undefined || value === "") return <span className="text-shell-text-faint">&nbsp;</span>;

  const findOption = (id: unknown) => column.options.find((option) => option.id === String(id));

  switch (column.type) {
    case "status":
    case "label": {
      const option = findOption(value);
      return option ? (
        <span className="block truncate rounded px-2 py-1 text-center text-[12.5px] font-medium text-white" style={{ background: option.color }}>
          {option.label}
        </span>
      ) : null;
    }
    case "dropdown":
    case "tags": {
      const ids = Array.isArray(value) ? value : [value];
      return (
        <span className="flex flex-wrap gap-1">
          {ids.map((id) => {
            const option = findOption(id);
            return (
              <span key={String(id)} className="rounded-full border border-shell-border-strong px-2 py-0.5 text-[12px]">
                {option?.label ?? String(id)}
              </span>
            );
          })}
        </span>
      );
    }
    case "people": {
      const ids = Array.isArray(value) ? value : [];
      return <span className="truncate">{ids.map((id) => people[String(id)]?.name).filter(Boolean).join(", ")}</span>;
    }
    case "date":
      return <span>{typeof value === "string" ? formatDate(value) : null}</span>;
    case "timeline": {
      const range = typeof value === "object" && value !== null && "start" in value ? (value as { start: string; end: string }) : null;
      const [start, end] = range ? [range.start, range.end] : typeof value === "string" ? value.split("..") : [];
      return start ? <span>{formatDate(start)}{end && end !== start ? ` to ${formatDate(end)}` : ""}</span> : null;
    }
    case "checkbox":
      return value === true ? <span className="font-bold text-[#00c875]" aria-label="Checked">✓</span> : null;
    case "rating": {
      const rating = Number(value) || 0;
      return <span className="text-[#fdab3d]" aria-label={`${rating} of 5`}>{"★".repeat(rating)}<span className="text-shell-border-strong">{"★".repeat(Math.max(0, 5 - rating))}</span></span>;
    }
    case "progress":
      return <span>{Number(value) || 0}%</span>;
    case "vote":
      return <span>{Array.isArray(value) ? value.length : 0} votes</span>;
    case "link": {
      const link = typeof value === "object" && value !== null ? (value as { url?: string; text?: string }) : { url: String(value) };
      return link.url && isSafeUrl(link.url) ? (
        <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-brand-500 hover:underline">
          {link.text || link.url}
        </a>
      ) : null;
    }
    case "time_tracking": {
      const seconds = typeof value === "object" && value !== null && "seconds" in value ? Number((value as { seconds: number }).seconds) : 0;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return <span>{`${hours}h ${String(minutes).padStart(2, "0")}m`}</span>;
    }
    case "checklist": {
      const lines = Array.isArray(value) ? (value as { is_done?: boolean }[]) : [];
      return <span>{lines.filter((line) => line.is_done).length}/{lines.length}</span>;
    }
    case "auto_number":
      return <span>#{String(value)}</span>;
    default:
      return <span className="truncate">{typeof value === "object" ? "" : String(value)}</span>;
  }
};

/**
 * A board view opened from its public "Share view" link: every group as a
 * read only table, with a search box. Asks for the password first when the
 * link has one.
 */
const SharedViewPage: React.FC<{ token: string }> = ({ token }) => {
  const [view, setView] = useState<SharedViewDto | null>(null);
  const [page_state, setPageState] = useState<PageState>("loading");
  const [board_label, setBoardLabel] = useState("");
  const [password, setPassword] = useState("");
  const [password_error, setPasswordError] = useState<string | null>(null);
  const [unavailable_message, setUnavailableMessage] = useState("");
  const [is_unlocking, setIsUnlocking] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed_group_ids, setCollapsedGroupIds] = useState<Set<number>>(new Set());

  const open = useCallback(
    async (attempt_password?: string) => {
      try {
        const result = await boardShareService.openSharedView(token, attempt_password);
        setView(result);
        setPageState("ready");
        document.title = `${result.view.label} | ${result.board.label}`;
      } catch (error) {
        const api_error = error as PublicApiError & { requires_password?: boolean; board?: { label: string } };
        const is_throttled = api_error.status_code === 429;

        if (api_error.status_code === 401 && api_error.requires_password) {
          setBoardLabel(api_error.board?.label ?? "");
          setPasswordError(attempt_password ? api_error.message ?? "That password is not correct." : null);
          setPageState("password");
        } else if (is_throttled && attempt_password) {
          // Too many wrong guesses: stay on the password form with a hint.
          setPasswordError("Too many attempts. Please wait a minute and try again.");
        } else {
          setUnavailableMessage(is_throttled ? "Too many requests. Please wait a minute and try again." : api_error.message ?? "This link is not available.");
          setPageState("unavailable");
        }
      }
    },
    [token]
  );

  useEffect(() => {
    void open();
  }, [open]);

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;
    setIsUnlocking(true);
    await open(password);
    setIsUnlocking(false);
  };

  const items_by_group = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const map = new Map<number, SharedViewDto["items"]>();
    for (const item of view?.items ?? []) {
      if (normalized && !item.name.toLowerCase().includes(normalized)) continue;
      map.set(item.group_id, [...(map.get(item.group_id) ?? []), item]);
    }
    return map;
  }, [view, query]);

  const toggleGroup = (group_id: number) =>
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(group_id)) next.delete(group_id);
      else next.add(group_id);
      return next;
    });

  if (page_state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" role="status" aria-label="Loading view" />
      </div>
    );
  }

  if (page_state === "unavailable") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-bold">Link unavailable</h1>
        <p className="text-[14px] text-shell-text-muted">{unavailable_message}</p>
      </main>
    );
  }

  if (page_state === "password" || !view) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={handleUnlock} className="w-full max-w-sm rounded-2xl border border-shell-border bg-shell-panel p-7">
          <h1 className="text-lg font-bold">{board_label || "Shared view"}</h1>
          <p className="mt-1 text-[13.5px] text-shell-text-muted">This view is password protected.</p>
          <label htmlFor="shared-view-password" className="mt-5 block text-[12.5px] font-semibold text-shell-text-secondary">
            Password
          </label>
          <input
            id="shared-view-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-[10px] border border-shell-border-strong bg-shell-bg px-3 py-2.5 text-[14px] outline-none focus:border-brand-500"
          />
          {password_error && (
            <p role="alert" className="mt-2 text-[12.5px] text-error-400">
              {password_error}
            </p>
          )}
          <button
            type="submit"
            disabled={is_unlocking || !password}
            className="mt-4 w-full rounded-[10px] bg-brand-500 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            {is_unlocking ? "Checking..." : "View"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.05em] text-shell-text-muted">Shared view, read only</p>
          <h1 className="truncate text-2xl font-bold tracking-[-0.01em]">{view.board.label}</h1>
          <p className="text-[13.5px] text-shell-text-muted">{view.view.label}</p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search items"
          aria-label="Search items"
          className="w-full max-w-[260px] rounded-[10px] border border-shell-border-strong bg-shell-panel px-3 py-2 text-[13.5px] outline-none focus:border-brand-500"
        />
      </header>

      <div className="flex flex-col gap-7">
        {view.groups.map((group) => {
          const group_items = items_by_group.get(group.id) ?? [];
          const is_collapsed = collapsed_group_ids.has(group.id);
          if (query && group_items.length === 0) return null;

          return (
            <section key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!is_collapsed}
                className="mb-2 flex items-center gap-2 text-left text-[15px] font-semibold"
                style={{ color: group.color }}
              >
                <span className={`inline-block transition-transform ${is_collapsed ? "-rotate-90" : ""}`} aria-hidden="true">▾</span>
                {group.name}
                <span className="text-[12.5px] font-normal text-shell-text-muted">{group_items.length} {group_items.length === 1 ? "item" : "items"}</span>
              </button>

              {!is_collapsed && (
                <div className="overflow-x-auto rounded-lg border border-shell-border" style={{ borderLeft: `4px solid ${group.color}` }}>
                  <table className="w-full min-w-max border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-shell-panel text-left text-[12.5px] text-shell-text-muted">
                        <th scope="col" className="sticky left-0 z-[1] min-w-[260px] border-b border-r border-shell-border bg-shell-panel px-3 py-2 font-medium">Item</th>
                        {view.columns.map((column) => (
                          <th key={column.id} scope="col" className="border-b border-r border-shell-border px-3 py-2 text-center font-medium" style={{ minWidth: Math.max(column.width, 120) }}>
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group_items.map((item) => (
                        <tr key={item.id} className="bg-shell-bg hover:bg-shell-hover">
                          <th scope="row" className="sticky left-0 z-[1] border-b border-r border-shell-border bg-inherit px-3 py-2 text-left font-normal">
                            {item.name}
                            {item.subitem_count > 0 && (
                              <span className="ml-2 text-[11.5px] text-shell-text-faint">{item.subitem_count} subitems</span>
                            )}
                          </th>
                          {view.columns.map((column) => (
                            <td key={column.id} className="max-w-[320px] border-b border-r border-shell-border px-2 py-1.5 text-center">
                              <SharedCell column={column} value={item.values[String(column.id)]} people={view.people} />
                            </td>
                          ))}
                        </tr>
                      ))}
                      {group_items.length === 0 && (
                        <tr>
                          <td colSpan={view.columns.length + 1} className="px-3 py-3 text-shell-text-faint">No items</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {view.is_truncated && (
        <p className="mt-6 text-[12.5px] text-shell-text-muted">Only the first 2,000 items are shown.</p>
      )}
    </main>
  );
};

export default SharedViewPage;
