"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { buildWorkspaceManagePath } from "@/components/workspace-manage/tab-routing";
import { bucketFor } from "@/components/my-work/myWorkBuckets";
import WorkspaceBadge from "@/layout/WorkspaceBadge";
import { StarIcon } from "@/icons/workspace-icons";
import { TableViewIcon } from "@/icons/board-icons";
import { notificationsService } from "@/services/notifications.service";
import { default_notification_filters } from "@/data/notifications-data";
import { personalService } from "@/services/personal.service";
import type { NotificationDto } from "@/types/notifications";
import type { MyWorkItemDto, RecentBoardDto } from "@/types/personal";
import WorkspaceMonogram from "./WorkspaceMonogram";

const greetingFor = (date: Date): string => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const relativeTime = (iso: string): string => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString();
};

const formatDueDate = (value: string): string =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const SECTION_CLASS = "rounded-2xl border border-shell-border bg-shell-panel p-5";

/**
 * monday.com's Home page, the app's landing route: recently visited boards,
 * what is due from My Work, the latest notifications and the user's
 * workspaces, each linking to the full page.
 */
const HomeView: React.FC = () => {
  const { user } = useAuth();
  const { my_workspaces } = useWorkspaces();
  const [recent_boards, setRecentBoards] = useState<RecentBoardDto[] | null>(null);
  const [my_work, setMyWork] = useState<MyWorkItemDto[] | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    personalService.getRecentBoards().then((boards) => !cancelled && setRecentBoards(boards)).catch(() => !cancelled && setRecentBoards([]));
    personalService.getMyWork().then((result) => !cancelled && setMyWork(result.items)).catch(() => !cancelled && setMyWork([]));
    notificationsService
      .listNotifications({ filters: { ...default_notification_filters, unread_only: true }, limit: 6 })
      .then((page) => !cancelled && setNotifications(page.data))
      .catch(() => !cancelled && setNotifications([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const work_summary = useMemo(() => {
    const open_items = (my_work ?? []).filter((item) => !item.is_done);
    const overdue = open_items.filter((item) => bucketFor(item, today) === "past_dates");
    const due_today = open_items.filter((item) => bucketFor(item, today) === "today");
    const this_week = open_items.filter((item) => bucketFor(item, today) === "this_week");
    const upcoming = [...overdue, ...due_today, ...this_week]
      .sort((a, b) => (a.date?.value ?? "").localeCompare(b.date?.value ?? ""))
      .slice(0, 6);
    return { overdue: overdue.length, today: due_today.length, this_week: this_week.length, upcoming };
  }, [my_work, today]);

  const toggleFavorite = async (board: RecentBoardDto) => {
    const next_value = !board.is_favorite;
    setRecentBoards((current) => current?.map((candidate) => (candidate.id === board.id ? { ...candidate, is_favorite: next_value } : candidate)) ?? null);
    try {
      await personalService.setFavorite(board.id, next_value);
    } catch {
      setRecentBoards((current) => current?.map((candidate) => (candidate.id === board.id ? { ...candidate, is_favorite: !next_value } : candidate)) ?? null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8">
      <header className="mb-6">
        <p className="text-[13px] text-shell-text-muted">
          {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-[26px] font-extrabold tracking-[-0.015em] text-shell-text">
          {greetingFor(today)}
          {user?.first_name ? `, ${user.first_name}` : ""}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className={SECTION_CLASS} aria-labelledby="home-recent-title">
            <h2 id="home-recent-title" className="mb-3 text-[15px] font-semibold text-shell-text">Recently visited</h2>
            {recent_boards === null ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-[86px] animate-pulse rounded-xl bg-shell-hover" />
                ))}
              </div>
            ) : recent_boards.length === 0 ? (
              <p className="text-[13px] text-shell-text-muted">Boards you open show up here, so you can jump back in.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {recent_boards.map((board) => (
                  <li key={board.id} className="group relative rounded-xl border border-shell-border transition-colors hover:border-shell-border-strong hover:bg-shell-hover">
                    <Link href={`/boards/${board.id}`} className="flex h-full flex-col gap-2 p-3.5 pr-10">
                      <span className="flex items-center gap-2 text-shell-text">
                        <TableViewIcon size={15} className="flex-none text-shell-text-muted" />
                        <span className="truncate text-[14px] font-semibold">{board.label}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px] text-shell-text-muted">
                        <WorkspaceMonogram workspace={board.workspace} size={14} />
                        <span className="truncate">{board.workspace?.name ?? "Workspace"}</span>
                        <span aria-hidden="true">·</span>
                        <span className="flex-none">{relativeTime(board.visited_at)}</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(board)}
                      aria-pressed={board.is_favorite}
                      aria-label={board.is_favorite ? `Remove ${board.label} from favorites` : `Add ${board.label} to favorites`}
                      className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-shell-hover-strong ${
                        board.is_favorite ? "text-sunset-200" : "text-shell-text-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      }`}
                    >
                      <StarIcon filled={board.is_favorite} size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={SECTION_CLASS} aria-labelledby="home-work-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="home-work-title" className="text-[15px] font-semibold text-shell-text">My work</h2>
              <Link href="/my-work" className="text-[12.5px] font-semibold text-brand-500 hover:underline">Open My work</Link>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                { label: "Overdue", value: work_summary.overdue, color: "#e2445c" },
                { label: "Due today", value: work_summary.today, color: "#00c875" },
                { label: "This week", value: work_summary.this_week, color: "#579bfc" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-shell-border px-3.5 py-3">
                  <p className="text-[22px] font-bold leading-none" style={{ color: my_work === null ? undefined : stat.color }}>
                    {my_work === null ? "-" : stat.value}
                  </p>
                  <p className="mt-1 text-[12px] text-shell-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
            {my_work !== null && work_summary.upcoming.length === 0 ? (
              <p className="text-[13px] text-shell-text-muted">Nothing due this week. Nice.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-shell-border">
                {work_summary.upcoming.map((item) => {
                  const is_overdue = bucketFor(item, today) === "past_dates";
                  return (
                    <li key={item.id}>
                      <Link href={`/boards/${item.board.id}/pulses/${item.parent?.id ?? item.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand-500">
                        <span className="h-2 w-2 flex-none rounded-full" style={{ background: item.status?.color ?? "#c4c4c4" }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-shell-text">{item.name}</span>
                          <span className="block truncate text-[12px] text-shell-text-muted">{item.board.label}</span>
                        </span>
                        {item.date && (
                          <span className={`flex-none text-[12.5px] ${is_overdue ? "font-semibold text-error-400" : "text-shell-text-muted"}`}>
                            {formatDueDate(item.date.value)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className={SECTION_CLASS} aria-labelledby="home-inbox-title">
            <h2 id="home-inbox-title" className="mb-3 text-[15px] font-semibold text-shell-text">Unread notifications</h2>
            {notifications === null ? (
              <div className="space-y-2">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-10 animate-pulse rounded-lg bg-shell-hover" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-[13px] text-shell-text-muted">You&apos;re all caught up.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {notifications.map((notification) => {
                  const content = (
                    <>
                      <span className="block text-[13px] text-shell-text">
                        <span className="font-semibold">{notification.actor.name}</span> {notification.action_label}{" "}
                        <span className="font-medium">{notification.action_target}</span>
                      </span>
                      <span className="block text-[11.5px] text-shell-text-muted">
                        {notification.board?.name ? `${notification.board.name} · ` : ""}
                        {relativeTime(notification.created_at)}
                      </span>
                    </>
                  );
                  return (
                    <li key={notification.id}>
                      {notification.link ? (
                        <Link href={notification.link} className="block rounded-lg px-2 py-1.5 hover:bg-shell-hover">{content}</Link>
                      ) : (
                        <div className="px-2 py-1.5">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={SECTION_CLASS} aria-labelledby="home-workspaces-title">
            <h2 id="home-workspaces-title" className="mb-3 text-[15px] font-semibold text-shell-text">My workspaces</h2>
            {my_workspaces.length === 0 ? (
              <p className="text-[13px] text-shell-text-muted">You haven&apos;t joined a workspace yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {my_workspaces.map((workspace) => (
                  <li key={workspace.id}>
                    <Link href={buildWorkspaceManagePath(Number(workspace.id))} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] text-shell-text hover:bg-shell-hover">
                      <WorkspaceBadge workspace={workspace} size={24} />
                      <span className="truncate">{workspace.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
