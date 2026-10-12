"use client";
import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { openShellPanel } from "@/layout/shell-events";
import HomeHero from "./HomeHero";
import HomeMyWork from "./HomeMyWork";
import HomeSection from "./HomeSection";
import HomeStatTiles from "./HomeStatTiles";
import RecentBoardCard from "./RecentBoardCard";
import { HomeFavoritesList, HomeInboxList, HomeWorkspacesList } from "./HomeSideLists";
import { buildDayRecap, buildWorkSummary, firstBusyTab, type HomeWorkTab } from "./homeSummary";
import { useCollapsedSections } from "./useCollapsedSections";
import { useHomeData } from "./useHomeData";
import "./home.css";

/** Board cards shown before "Show all". */
const RECENT_BOARDS_PREVIEW = 6;

/**
 * The app's landing page after sign in, styled after monday.com's Home: a
 * welcome hero with the day's recap and quick actions, stat tiles, recently
 * visited boards with a live snapshot, the items due soon, the unread inbox,
 * favorites and the user's workspaces.
 */
const HomeView: React.FC = () => {
  const { user } = useAuth();
  const { my_workspaces } = useWorkspaces();
  const { recent_boards, my_work, notifications, unread_count, favorites, toggleBoardFavorite } = useHomeData();
  const { isCollapsed, toggleSection, expandSection } = useCollapsedSections();
  const [picked_tab, setPickedTab] = useState<HomeWorkTab | null>(null);
  const [is_showing_all_boards, setIsShowingAllBoards] = useState(false);
  const my_work_ref = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const work_summary = useMemo(() => (my_work === null ? null : buildWorkSummary(my_work, today)), [my_work, today]);
  const active_tab = picked_tab ?? (work_summary ? firstBusyTab(work_summary) : "today");
  const work_counts = work_summary
    ? { past_dates: work_summary.past_dates.length, today: work_summary.today.length, this_week: work_summary.this_week.length }
    : null;
  const recap =
    work_counts && unread_count !== null
      ? buildDayRecap({ overdue: work_counts.past_dates, today: work_counts.today, unread: unread_count })
      : null;

  const visible_boards = is_showing_all_boards ? recent_boards : recent_boards?.slice(0, RECENT_BOARDS_PREVIEW);

  /** A stat tile picks its tab, unfolds My work and scrolls it into view. */
  const showWorkTab = (tab: HomeWorkTab) => {
    setPickedTab(tab);
    expandSection("my_work");
    requestAnimationFrame(() => my_work_ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openInbox = () => openShellPanel("notifications");

  return (
    <div className="home-theme">
      <div className="home-page">
        <HomeHero user={user} today={today} recap={recap} />
        <HomeStatTiles counts={work_counts} unread={unread_count} onSelectTab={showWorkTab} onOpenInbox={openInbox} />

        <div className="home-grid">
          <div className="home-column">
            <HomeSection
              title="Recently visited"
              count={recent_boards?.length ?? null}
              is_collapsed={isCollapsed("recent_boards")}
              onToggle={() => toggleSection("recent_boards")}
              delay={160}
              action={
                recent_boards && recent_boards.length > RECENT_BOARDS_PREVIEW ? (
                  <button type="button" className="home-link" onClick={() => setIsShowingAllBoards((current) => !current)}>
                    {is_showing_all_boards ? "Show less" : `Show all (${recent_boards.length})`}
                  </button>
                ) : null
              }
            >
              {visible_boards === undefined || visible_boards === null ? (
                <div className="home-board-grid">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="home-skeleton h-[196px]" />
                  ))}
                </div>
              ) : visible_boards.length === 0 ? (
                <p className="home-empty">
                  <span className="text-[20px]" aria-hidden="true">
                    🧭
                  </span>
                  Boards you open show up here, so you can jump right back in.
                </p>
              ) : (
                <ul className="home-board-grid">
                  {visible_boards.map((board) => (
                    <RecentBoardCard key={board.id} board={board} onToggleFavorite={(target) => void toggleBoardFavorite(target)} />
                  ))}
                </ul>
              )}
            </HomeSection>

            <div ref={my_work_ref} className="scroll-mt-4">
              <HomeSection
                title="My work"
                is_collapsed={isCollapsed("my_work")}
                onToggle={() => toggleSection("my_work")}
                delay={220}
                action={
                  <Link href="/my-work" className="home-link">
                    Open My work
                  </Link>
                }
              >
                <HomeMyWork summary={work_summary} active_tab={active_tab} onSelectTab={setPickedTab} />
              </HomeSection>
            </div>
          </div>

          <div className="home-column">
            <HomeSection
              title="Inbox"
              count={unread_count}
              is_collapsed={isCollapsed("inbox")}
              onToggle={() => toggleSection("inbox")}
              delay={200}
            >
              <HomeInboxList notifications={notifications} onOpenInbox={openInbox} />
            </HomeSection>

            <HomeSection
              title="Favorites"
              count={favorites?.length ?? null}
              is_collapsed={isCollapsed("favorites")}
              onToggle={() => toggleSection("favorites")}
              delay={260}
            >
              <HomeFavoritesList favorites={favorites} />
            </HomeSection>

            <HomeSection
              title="My workspaces"
              count={my_workspaces.length}
              is_collapsed={isCollapsed("workspaces")}
              onToggle={() => toggleSection("workspaces")}
              delay={320}
            >
              <HomeWorkspacesList workspaces={my_workspaces} />
            </HomeSection>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
